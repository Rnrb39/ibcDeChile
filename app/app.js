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
let pickerPage=0;
let browsingSeries=false;
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

function playLabel() { return currentCategory === 'predicaciones' ? '▶ Reproducir sermón' : '▶ Reproducir'; }

function reportStorage() {
  progressStatus.textContent = progress.failed ? 'En este dispositivo no se puede asegurar el guardado del punto de escucha. Puedes seguir reproduciendo.' : '';
}

function showSavedProgress() {
  savedChoice = progress.find(recordings);
  resumePanel.hidden = !savedChoice || !player.paused;
  if (savedChoice) {
    document.getElementById('resume-title').textContent = savedChoice.item.title;
    resumePlay.textContent = `Continuar desde ${IBCPlaybackProgress.formatPosition(savedChoice.record.position)}`;
  }
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
}

function seekBy(offset) {
  if (!activeMedia() || player.readyState < 1) return;
  const position = IBCPlaybackProgress.seekPosition(player.currentTime, offset, player.duration);
  if (position === null) return;
  try {
    player.currentTime = position;
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
  playButton.textContent = playLabel();
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
  document.getElementById('sermon-meta').textContent = [item.speaker, formatDate(item)].filter(Boolean).join(' · ');
  document.getElementById('latest-note').hidden = !isSermon || item.id !== latestId || !confirmedDate(item);
  const transcript = document.getElementById('transcript');
  transcript.hidden = !item.transcriptText;
  transcript.open = false;
  document.getElementById('transcript-text').textContent = item.transcriptText || '';
  document.querySelectorAll('.sermon-choice').forEach(button => {
    button.setAttribute('aria-current', String(button.dataset.id === currentId));
  });
  changingMessage = false;
  pickerPage=Math.floor(Math.max(0,currentSeries().findIndex(record=>record.id===currentId))/IBCLibrary.PAGE_SIZE);
  renderSeriesNavigation();
  document.getElementById('player-state').textContent='Pausado. Pulsa Reproducir para escuchar.';
  showSavedProgress();
  if (moveFocus) {
    document.getElementById('sermons-section').open = false;
    document.getElementById('message-picker').open = false;
    document.getElementById('sermon-title').focus();
    document.getElementById('sermon-content').scrollIntoView({ block: 'start' });
  }
}

function recordingChoice(item, startPlayback = false) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sermon-choice';
  button.dataset.id = item.id;
  button.setAttribute('aria-current',String(item.id===currentId));
  button.setAttribute('aria-controls', 'sermon-content');
  const title = document.createElement('span');
  title.className = 'choice-title';
  title.textContent = IBCLibrary.label(item);
  const meta = document.createElement('span');
  meta.className = 'choice-meta';
  meta.textContent = [item.passage, formatDate(item)].filter(Boolean).join(' · ');
  button.append(title, meta);
  button.addEventListener('click', () => {
    browsingSeries=true;
    selectSermon(item, true);
    if (startPlayback) startAudio();
  });
  li.append(button);
  return li;
}

function renderSchoolCategory(category, items) {
  const container = document.getElementById(`${category}-recordings`);
  container.replaceChildren();
  if (!items.length) {
    const message = document.createElement('p');
    message.textContent = 'Próximamente estarán disponibles las grabaciones';
    container.append(message);
    return;
  }
  const latest = items[0];
  const label = document.createElement('p');
  label.className = 'hint';
  label.textContent = category==='catecismo-confesion' && Number.isSafeInteger(latest.catechismQuestion) ? 'Pregunta más alta disponible' : confirmedDate(latest) ? 'Grabación más reciente con fecha confirmada' : 'Grabación disponible';
  const title = document.createElement('h3');
  title.className = 'recording-title';
  title.textContent = IBCLibrary.label(latest);
  const meta = document.createElement('p');
  meta.className = 'metadata';
  meta.textContent = [latest.speaker, formatDate(latest)].filter(Boolean).join(' · ');
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'primary-button school-play';
  play.textContent = 'Reproducir';
  play.setAttribute('aria-label', `Reproducir: ${latest.title}`);
  play.setAttribute('aria-controls', 'sermon-content');
  play.addEventListener('click', () => { browsingSeries=true;selectSermon(latest, true); startAudio(); });
  container.append(label, title, meta, play);
  if (items.length > 1) {
    const older = document.createElement('details');
    older.className = 'older-recordings';
    const summary = document.createElement('summary');
    summary.textContent = 'Ver grabaciones anteriores';
    const list = document.createElement('ol');
    list.className = 'sermon-list';
    items.slice(1,11).forEach(item => list.append(recordingChoice(item)));
    older.append(summary, list);
    container.append(older);
  }
  const seriesChoices=document.createElement('div');
  seriesChoices.className='sermon-list';
  for(const group of IBCLibrary.groups(items,category))seriesChoices.append(seriesChoice(group));
  container.append(seriesChoices);
}

function currentSeries() {
  return currentItem ? IBCLibrary.sequence(recordings.filter(item=>hasAudio(item) && IBCLibrary.key(item)===IBCLibrary.key(currentItem))) : [];
}
function currentTraversal() { return IBCLibrary.traversal(currentSeries()); }
function seriesChoice(group) {
  const button=document.createElement('button');
  button.type='button';button.className='sermon-choice';button.dataset.series=group.key;
  button.textContent=group.title+' · '+group.items.length+' grabaciones';
  button.addEventListener('click',()=>{
    browsingSeries=true;
    selectSermon(group.items[0],true);
    document.getElementById('message-picker').open=true;
  });
  return button;
}
function renderSeriesNavigation() {
  const items=currentSeries(),traversal=currentTraversal(),position=traversal.findIndex(item=>item.id===currentId);
  document.getElementById('series-navigation').hidden=position<0 || !browsingSeries;
  if(position<0)return;
  document.getElementById('selected-series').textContent=currentItem.series || 'Grabaciones';
  document.getElementById('previous-message').disabled=position===0;
  document.getElementById('next-message').disabled=position===items.length-1;
  const page=IBCLibrary.page(items,pickerPage);pickerPage=page.index;
  const focusedId=document.activeElement?.dataset?.id;
  const list=document.getElementById('sermon-list');list.replaceChildren();
  page.items.forEach(item=>list.append(recordingChoice(item)));
  if(focusedId){
    const target=[...list.children].map(li=>li.children[0]).find(button=>button.dataset.id===focusedId);
    (target || document.getElementById('message-range')).focus();
  }
  document.getElementById('message-range').textContent='Grabaciones '+(page.start+1)+'–'+page.end+' de '+items.length;
  for(const [id,index,direction] of [['previous-group',page.index-1,'anteriores'],['next-group',page.index+1,'siguientes']]) {
    const button=document.getElementById(id),available=index>=0 && index<page.pages;
    button.disabled=!available;button.hidden=!available;
    if(available) {
      const count=IBCLibrary.page(items,index).items.length;
      button.textContent=`Ver ${count} ${count===1?'grabación': 'grabaciones'} ${count===1?(direction==='anteriores'?'anterior':'siguiente'):direction}`;
    }
  }
}
function changeGroup(index) {
  pickerPage=index;renderSeriesNavigation();
  document.getElementById('message-range').focus();
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
document.getElementById('previous-group').addEventListener('click',()=>changeGroup(pickerPage-1));
document.getElementById('next-group').addEventListener('click',()=>changeGroup(pickerPage+1));

async function loadCatalog() {
  if(catalogLoading)return;
  catalogLoading=true;lastCatalogCheck=Date.now();
  retryCatalog.hidden=true;
  catalogStatus.textContent=recordings.length?'Buscando nuevas grabaciones…':'Cargando las predicaciones…';
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
    let warning='',retainPrevious=false;
    if(globalThis.IBCPublicCatalogConfig?.enabled) {
      try {
        const result=await publicClient.load();
        catalog=IBCPublicCatalog.merge(catalog,result.catalog);
        if(result.stale){warning='No pudimos actualizar. Conservamos las grabaciones disponibles.';retainPrevious=true;}
      }catch{warning='No pudimos actualizar. Conservamos las grabaciones disponibles.';retainPrevious=true;}
    }else if(!localLoaded)throw Error('Catalog unavailable');
    if(retainPrevious && recordings.length){catalogStatus.textContent=warning;retryCatalog.hidden=false;return;}
    const candidate=IBCAudioCatalog.prepare(catalog);
    const available=candidate.filter(hasAudio);
    if(!available.length)throw Error('No playable audio');
    recordings=candidate;
    const items=orderRecordings(available.filter(item=>item.category==='predicaciones'));
    latestId=items[0]?.id || null;
    document.getElementById('audio-availability').textContent=available.length+' audios disponibles para escuchar.';
    const seriesList=document.getElementById('series-list');seriesList.replaceChildren();
    for(const group of IBCLibrary.groups(items,'predicaciones'))seriesList.append(seriesChoice(group));
    for(const category of Object.keys(schoolCategories))renderSchoolCategory(category,orderRecordings(available.filter(item=>item.category===category)));
    const initial=items[0] || orderRecordings(available)[0];
    document.getElementById('sermon-content').hidden=false;
    catalogStatus.textContent=warning;retryCatalog.hidden=!warning;
    if(!currentItem)selectSermon(initial);
    else {
      document.getElementById('latest-note').hidden=currentCategory!=='predicaciones' || currentId!==latestId || !confirmedDate(currentItem);
      document.getElementById('player-heading').textContent=currentCategory==='predicaciones' && currentId===latestId?'Último mensaje con audio':'Escuchar predicación';
      renderSeriesNavigation();showSavedProgress();
    }
  }catch {
    catalogStatus.textContent=recordings.length?'No pudimos actualizar. Conservamos las grabaciones disponibles.':'No pudimos cargar las predicaciones. Revisa tu conexión y vuelve a intentarlo.';
    retryCatalog.hidden=false;
  }finally{catalogLoading=false;}
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
    playbackStatus.textContent = 'No se pudo iniciar el audio. Revisa tu conexión o usa el botón de reproducción del reproductor.';
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
  playButton.textContent = currentCategory === 'predicaciones' ? 'Ⅱ Pausar sermón' : 'Ⅱ Pausar';
});
player.addEventListener('pause', () => {
  document.getElementById('player-state').textContent='Pausado';
  playButton.textContent = playLabel();
  if (!changingMessage) { saveProgress(); showSavedProgress(); }
});
player.addEventListener('ended', () => {
  if (activeMedia() && hasPlayed) {
    pendingResume = null;
    progress.clear();
    hasPlayed = false;
    showSavedProgress();
  }
  playButton.textContent = '▶ Volver a escuchar';
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
  retryAudio.hidden = false;
  showSavedProgress();
});
player.addEventListener('loadedmetadata', () => { updateSeekControls(); applyPendingResume(); });
player.addEventListener('durationchange', updateSeekControls);
player.addEventListener('canplay', applyPendingResume);
player.addEventListener('seeked', () => { saveProgress(); showSavedProgress(); });
player.addEventListener('timeupdate', () => {
  if (!player.paused && Date.now() - lastSavedAt >= 10000) saveProgress();
});
player.addEventListener('emptied', updateSeekControls);
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
retryCatalog.addEventListener('click', loadCatalog);
function updateConnection() { document.getElementById('connection-status').hidden = navigator.onLine; }
window.addEventListener('online', updateConnection);
window.addEventListener('online',refreshCatalog);
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
