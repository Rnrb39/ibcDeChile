'use strict';

const player = document.getElementById('player');
const playButton = document.getElementById('play-button');
const playbackStatus = document.getElementById('playback-status');
const catalogStatus = document.getElementById('catalog-status');
const retryAudio = document.getElementById('retry-audio');
const retryCatalog = document.getElementById('retry-catalog');
const seekBack = document.getElementById('seek-back');
const seekForward = document.getElementById('seek-forward');
const resumePanel = document.getElementById('resume-panel');
const resumePlay = document.getElementById('resume-play');
const restartPlay = document.getElementById('restart-play');
const progressStatus = document.getElementById('progress-status');
const progress = IBCPlaybackProgress.createStore(() => window.localStorage);
let currentId = null;
let latestId = null;
let currentCategory = 'predicaciones';
let currentItem = null;
let recordings = [];
let catalogLoading=false;
let catalogFailed=false;
let catalogNoticeTimer=null;
let reconnectTimer=null;
let reportedCatalogFailure='';
let lastCatalogCheck=0;
const REFRESH_INTERVAL=5*60*1000;
let publicClient;
try{publicClient=IBCPublicCatalog.create({storage:window.localStorage});}catch{publicClient=IBCPublicCatalog.create();}
let hasPlayed = false;
let changingMessage = false;
let pendingResume = null;
let savedChoice = null;
let lastSavedAt = 0;
const schoolCategories = { 'catecismo-confesion': 'Catecismo y confesión', 'taller-biblico': 'Taller bíblico' };
const { formatDate, confirmedDate, orderRecordings, hasAudio } = IBCAudioCatalog;

const views=IBCViews.create({document,window,library:IBCLibrary,hasAudio,recordings:()=>recordings,current:()=>currentItem,isPlaying:()=>!player.paused,saved:()=>progress.find(recordings),select:item=>selectSermon(item,true),catalogFailed:()=>catalogFailed});
function playLabel() { return 'Reproducir'; }
function setPlayLabel(label) {
  playButton.textContent=label==='Pausar'?'Ⅱ':'▶';
  playButton.setAttribute('aria-label',label);
  document.getElementById('play-caption').textContent=label;
}
function updatePlaybackPosition() {
  const ready=activeMedia() && player.readyState>=1 && Number.isFinite(player.duration) && player.duration>0;
  const duration=ready?player.duration:currentItem?.audioDurationSeconds;
  const position=ready?player.currentTime:0;
  const slider=document.getElementById('playback-position');slider.disabled=!ready;
  slider.max=ready?player.duration:0;slider.value=position;
  const elapsed=IBCPlaybackProgress.formatPosition(position);
  const total=Number.isFinite(duration)?IBCPlaybackProgress.formatPosition(duration):'--:--';
  slider.setAttribute('aria-valuetext',elapsed+' de '+total);
  document.getElementById('elapsed-time').textContent=elapsed;
  document.getElementById('total-time').textContent=total;
}

function reportStorage() {
  progressStatus.textContent = progress.failed ? 'En este dispositivo no se puede asegurar el guardado del punto de escucha. Puedes seguir reproduciendo.' : '';
}

function showSavedProgress() {
  savedChoice = progress.find(recordings);
  resumePanel.hidden = !savedChoice || savedChoice.item.id!==currentId || !player.paused;
  if (savedChoice) {
    document.getElementById('resume-title').textContent = savedChoice.item.title;
    resumePlay.textContent = `Continuar desde ${IBCPlaybackProgress.formatPosition(savedChoice.record.position)}`;
  }
  views.continuation();
  reportStorage();
}

function activeMedia() {
  return currentItem && hasAudio(currentItem) && player.currentSrc === currentItem.audioUrl;
}

function saveProgress() {
  if (changingMessage || pendingResume || !hasPlayed || !activeMedia()) return;
  progress.save(currentItem, player.currentTime, player.duration);
  lastSavedAt = Date.now();
  reportStorage();
}

function updateSeekControls() {
  const ready = activeMedia() && player.readyState >= 1 && Number.isFinite(player.duration) && player.duration > 0;
  seekBack.disabled = !ready;
  seekForward.disabled = !ready;
  updatePlaybackPosition();
}

function seekBy(offset) {
  if (!activeMedia() || player.readyState < 1) return;
  const position = IBCPlaybackProgress.seekPosition(player.currentTime, offset, player.duration);
  if (position === null) return;
  try {
    player.currentTime = position;
    updatePlaybackPosition();
    document.getElementById('seek-status').textContent = `Posición: ${IBCPlaybackProgress.formatPosition(position)}`;
    saveProgress();
    showSavedProgress();
  } catch {
    document.getElementById('seek-status').textContent = 'Todavía no se puede cambiar la posición. Vuelve a intentarlo cuando cargue el audio.';
  }
}

function applyPendingResume() {
  if (!pendingResume || !activeMedia() || player.readyState < 1 || !Number.isFinite(player.duration)) return;
  const choice = pendingResume;
  if (choice.item.id !== currentId || IBCPlaybackProgress.audioVersion(currentItem) !== choice.record.mediaVersion) {
    pendingResume = null;
    return;
  }
  // Audio duration is checked only after an explicit playback action loads metadata.
  if (Math.abs(player.duration - choice.record.duration) > 2 || IBCPlaybackProgress.finished(choice.record.position, player.duration)) {
    pendingResume = null;
    hasPlayed = false;
    player.pause();
    progress.clearFor(currentItem);
    playbackStatus.textContent = 'El punto guardado ya no corresponde a este audio. Puedes escucharlo desde el principio.';
    showSavedProgress();
    return;
  }
  try {
    player.currentTime = choice.record.position;
    pendingResume = null;
  } catch {
    pendingResume = null;
    hasPlayed = false;
    player.pause();
    playbackStatus.textContent = 'No pudimos retomar el punto guardado. Puedes volver a intentarlo o escuchar desde el principio.';
    showSavedProgress();
  }
}

function selectSermon(item, moveFocus = false) {
  saveProgress();
  changingMessage = true;
  player.pause();
  pendingResume = null;
  hasPlayed = false;
  currentItem = item;
  playButton.disabled=!hasAudio(item);
  lastSavedAt = Date.now();
  currentCategory = item.category;
  setPlayLabel(playLabel());
  currentId = item.id;
  playbackStatus.textContent = '';
  retryAudio.hidden = true;
  document.getElementById('audio-controls').hidden = true;
  document.getElementById('seek-status').textContent = '';
  seekBack.disabled = true;
  seekForward.disabled = true;
  // Detach an already-loaded source when switching, but never attach a new one here.
  // With no src/source on startup there can be no automatic multimedia request.
  if (player.getAttribute('src')) {
    player.removeAttribute('src');
    player.load();
  }
  const isSermon = item.category === 'predicaciones';
  document.getElementById('player-heading').textContent = isSermon
    ? (item.id === latestId && confirmedDate(item) ? 'Último mensaje con audio' : 'Escuchar predicación')
    : schoolCategories[item.category];
  document.getElementById('sermon-series').textContent = [item.series, item.number ? `Mensaje ${item.number}` : ''].filter(Boolean).join(' · ');
  document.getElementById('sermon-title').textContent = item.title;
  document.getElementById('sermon-passage').textContent = item.passage || '';
  document.getElementById('sermon-meta').textContent = [item.speaker, formatDate(item)].filter(Boolean).join('\n');

  const transcript = document.getElementById('transcript');
  transcript.hidden = !item.transcriptText;
  transcript.open = false;
  document.getElementById('transcript-text').textContent = item.transcriptText || '';
  document.querySelectorAll('.sermon-choice').forEach(button => {
    button.setAttribute('aria-current', String(button.dataset.id === currentId));
  });
  changingMessage = false;
  views.selected(item,moveFocus);
  renderSeriesNavigation();
  updatePlaybackPosition();
  document.getElementById('player-state').textContent='Pausado';
  showSavedProgress();
}

function currentSeries() {
  return currentItem ? IBCLibrary.sequence(recordings.filter(item=>hasAudio(item) && IBCLibrary.key(item)===IBCLibrary.key(currentItem))) : [];
}
function currentTraversal() { return IBCLibrary.traversal(currentSeries()); }
function renderSeriesNavigation() {
  const items=currentTraversal(),position=items.findIndex(item=>item.id===currentId);
  document.getElementById('series-navigation').hidden=position<0;
  document.getElementById('selected-series').textContent=currentItem?.series || '';
  document.getElementById('previous-message').disabled=position<=0;
  document.getElementById('next-message').disabled=position<0 || position===items.length-1;
}
document.getElementById('previous-message').addEventListener('click',()=>{
  const items=currentTraversal(),index=items.findIndex(item=>item.id===currentId);
  if(index>0)selectSermon(items[index-1],true);
});
document.getElementById('next-message').addEventListener('click',()=>{
  const items=currentTraversal(),index=items.findIndex(item=>item.id===currentId);
  if(index>=0 && index<items.length-1)selectSermon(items[index+1],true);
});
document.getElementById('first-message').addEventListener('click',()=>{
  const item=currentTraversal()[0];if(item){selectSermon(item,true);startAudio();}
});
document.getElementById('last-message').addEventListener('click',()=>{
  const items=currentTraversal();if(items.length)selectSermon(items[items.length-1],true);
});

function dismissCatalogNotice() {
  window.clearTimeout(catalogNoticeTimer);catalogNoticeTimer=null;
  document.getElementById('catalog-notice').hidden=true;
  if(document.activeElement===document.getElementById('close-catalog-notice'))document.getElementById('contenido').focus();
}
function expireCatalogNotice() {
  window.clearTimeout(catalogNoticeTimer);
  catalogNoticeTimer=window.setTimeout(()=>{
    // Never remove the close control while someone is using it with a keyboard.
    if(document.activeElement!==document.getElementById('close-catalog-notice'))dismissCatalogNotice();
  },12000);
}
function reportCatalogFailure(message) {
  document.getElementById('catalog-last-status').textContent=message;
  document.getElementById('catalog-details').hidden=false;
  if(message===reportedCatalogFailure)return;
  reportedCatalogFailure=message;
  document.getElementById('catalog-announcement').textContent=message;
  catalogStatus.textContent=message;
  document.getElementById('catalog-notice').hidden=false;
  expireCatalogNotice();
}
function reportCatalogSuccess() {
  if(reportedCatalogFailure)document.getElementById('catalog-announcement').textContent='El catálogo está actualizado.';
  catalogFailed=false;reportedCatalogFailure='';dismissCatalogNotice();
  document.getElementById('catalog-last-status').textContent='El catálogo está actualizado.';
}
function catalogFailureMessage(publicFailure=false) {
  if(!recordings.length)return 'No se pudieron cargar las grabaciones en este momento. Puedes intentarlo nuevamente desde Inicio.';
  const host=window.location.hostname;
  const local=host==='localhost' || host==='127.0.0.1' || /^(?:192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/.test(host);
  return publicFailure && local
    ? 'No se pudo actualizar el catálogo público desde esta vista local. Puedes seguir escuchando las grabaciones disponibles.'
    : 'No se pudo actualizar en este momento. Puedes seguir escuchando las grabaciones disponibles.';
}
async function loadCatalog() {
  if(catalogLoading)return;
  catalogLoading=true;lastCatalogCheck=Date.now();
  window.clearTimeout(reconnectTimer);reconnectTimer=null;
  document.getElementById('catalog-loading').textContent=recordings.length?'':'Cargando las grabaciones…';
  try {
    let catalog={version:1,sermons:recordings.filter(item=>!String(item.id).startsWith('admin-'))};
    let localLoaded=false;
    try {
      const response=await fetch('catalog.json',{cache:'no-cache'});
      if(!response.ok)throw Error('Unavailable');
      const local=await response.json();
      if(local.version!==1 || !Array.isArray(local.sermons))throw Error('Invalid');
      catalog=local;localLoaded=true;
    }catch{}
    let warning=false,retainPrevious=false;
    if(globalThis.IBCPublicCatalogConfig?.enabled) {
      try {
        const result=await publicClient.load();
        catalog=IBCPublicCatalog.merge(catalog,result.catalog);
        if(result.stale){warning=true;retainPrevious=true;}
      }catch{warning=true;retainPrevious=true;}
    }else if(!localLoaded)throw Error('Catalog unavailable');
    if(retainPrevious && recordings.length){reportCatalogFailure(catalogFailureMessage(true));return;}
    const candidate=IBCAudioCatalog.prepare(catalog);
    const available=candidate.filter(hasAudio);
    if(!available.length)throw Error('No playable audio');
    recordings=candidate;catalogFailed=false;
    const items=orderRecordings(available.filter(item=>item.category==='predicaciones'));
    latestId=items[0]?.id || null;
    views.refresh();
    const initial=progress.find(recordings)?.item || items[0] || orderRecordings(available)[0];
    document.getElementById('sermon-content').hidden=false;
    if(warning)reportCatalogFailure(catalogFailureMessage(true));else reportCatalogSuccess();
    if(!currentItem)selectSermon(initial);
    else {
      document.getElementById('player-heading').textContent=currentCategory==='predicaciones' && currentId===latestId?'Último mensaje con audio':'Escuchar predicación';
      renderSeriesNavigation();views.refresh();showSavedProgress();
    }
  }catch {
    catalogFailed=!recordings.length;
    reportCatalogFailure(catalogFailureMessage());views.refresh();
  }finally{catalogLoading=false;document.getElementById('catalog-loading').textContent='';}
}
function refreshCatalog() {
  if(navigator.onLine && document.visibilityState==='visible' && Date.now()-lastCatalogCheck>=30000)loadCatalog();
}

async function startAudio() {
  if (!hasAudio(currentItem)) return;
  document.getElementById('audio-controls').hidden = false;
  playbackStatus.textContent = '';
  try {
    if (player.getAttribute('src') !== currentItem.audioUrl) {
      player.src = currentItem.audioUrl;
      player.load();
    }
    await player.play();
  }
  catch {
    playbackStatus.textContent = 'No se pudo iniciar el audio. Revisa tu conexión y vuelve a intentarlo.';
    retryAudio.hidden = false;
  }
}
playButton.addEventListener('click', () => {
  if (!player.paused) player.pause();
  else startAudio();
});
player.addEventListener('play', () => {
  hasPlayed = true;
  document.getElementById('player-state').textContent='Reproduciendo';
  resumePanel.hidden = true;
  setPlayLabel('Pausar');
  views.continuation();
});
player.addEventListener('pause', () => {
  document.getElementById('player-state').textContent='Pausado';
  setPlayLabel(playLabel());
  if (!changingMessage) { saveProgress(); showSavedProgress(); }
});
player.addEventListener('ended', () => {
  if (activeMedia() && hasPlayed) {
    pendingResume = null;
    progress.clear();
    hasPlayed = false;
    showSavedProgress();
  }
  setPlayLabel('Volver a escuchar');
  document.getElementById('player-state').textContent='Mensaje terminado';
});
player.addEventListener('playing', () => { playbackStatus.textContent = ''; retryAudio.hidden = true; });
player.addEventListener('error', () => {
  const wasResuming = Boolean(pendingResume);
  pendingResume = null;
  if (!wasResuming) saveProgress();
  seekBack.disabled = true;
  seekForward.disabled = true;
  playbackStatus.textContent = 'No pudimos cargar este audio. Revisa tu conexión al servidor del archivo y vuelve a intentarlo.';
  document.getElementById('playback-position').disabled=true;
  retryAudio.hidden = false;
  showSavedProgress();
});
player.addEventListener('loadedmetadata', () => { updateSeekControls(); applyPendingResume(); updatePlaybackPosition(); });
player.addEventListener('durationchange', updateSeekControls);
player.addEventListener('canplay', applyPendingResume);
player.addEventListener('seeked', () => { saveProgress(); showSavedProgress(); updatePlaybackPosition(); });
player.addEventListener('timeupdate', () => {
  updatePlaybackPosition();
  if (!player.paused && Date.now() - lastSavedAt >= 10000) saveProgress();
});
player.addEventListener('emptied', updateSeekControls);
document.getElementById('playback-position').addEventListener('change',()=>{
  const value=Number(document.getElementById('playback-position').value);
  if(Number.isFinite(value))seekBy(value-player.currentTime);
});
seekBack.addEventListener('click', () => seekBy(-15));
seekForward.addEventListener('click', () => seekBy(15));

function playSaved(fromBeginning) {
  // Revalidate on click too: progress may have expired while the app was open.
  const choice = progress.find(recordings);
  if (!choice) { showSavedProgress(); return; }
  selectSermon(choice.item, true);
  if (fromBeginning) progress.clear();
  else {
    pendingResume = choice;
    applyPendingResume();
    if (!pendingResume && playbackStatus.textContent) return;
  }
  resumePanel.hidden = true;
  // Called only by an explicit button click, preserving the mobile user gesture.
  startAudio();
}
resumePlay.addEventListener('click', () => playSaved(false));
restartPlay.addEventListener('click', () => playSaved(true));
retryAudio.addEventListener('click', () => {
  // Retry is itself an explicit playback action; startup and selection never load audio.
  player.removeAttribute('src');
  startAudio();
  retryAudio.hidden = true;
});
document.getElementById('close-catalog-notice').addEventListener('click',dismissCatalogNotice);
document.getElementById('close-catalog-notice').addEventListener('blur',()=>{
  if(!document.getElementById('catalog-notice').hidden)expireCatalogNotice();
});
retryCatalog.addEventListener('click',()=>{
  if(navigator.onLine && Date.now()-lastCatalogCheck>=30000){reportedCatalogFailure='';refreshCatalog();}
});
function retryAfterReconnect() {
  window.clearTimeout(reconnectTimer);
  reconnectTimer=window.setTimeout(()=>{reconnectTimer=null;refreshCatalog();},Math.max(0,30000-(Date.now()-lastCatalogCheck)));
}
function updateConnection() { document.getElementById('connection-status').hidden = navigator.onLine; }
window.addEventListener('online', updateConnection);
window.addEventListener('online',retryAfterReconnect);
window.addEventListener('offline', updateConnection);
window.addEventListener('pagehide', saveProgress);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress();
  else refreshCatalog();
});
// Both media events and a throttled timer can checkpoint; neither pauses background audio.
window.setInterval(() => { if (!player.paused) saveProgress(); }, 10000);
window.setInterval(refreshCatalog,REFRESH_INTERVAL);
updateConnection();
loadCatalog();
