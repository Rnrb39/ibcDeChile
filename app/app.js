'use strict';

const player = document.getElementById('player');
const playButton = document.getElementById('play-button');
const playbackStatus = document.getElementById('playback-status');
const catalogStatus = document.getElementById('catalog-status');
const retryVideo = document.getElementById('retry-video');
const retryCatalog = document.getElementById('retry-catalog');
let currentId = null;
let latestId = null;
let currentCategory = 'predicaciones';
const schoolCategories = { 'catecismo-confesion': 'Catecismo y confesión', 'taller-biblico': 'Taller bíblico' };
const { formatDate, confirmedDate, validRecording, orderRecordings } = IBCCatalog;

function playLabel() { return currentCategory === 'predicaciones' ? '▶ Reproducir sermón' : '▶ Reproducir'; }

function selectSermon(item, moveFocus = false) {
  player.pause();
  currentCategory = item.category;
  playButton.textContent = playLabel();
  currentId = item.id;
  playbackStatus.textContent = '';
  retryVideo.hidden = true;
  player.querySelectorAll('track').forEach(track => track.remove());
  // Future captions require a verified WebVTT URL and CORS on both media and captions.
  if (item.captionsUrl) player.crossOrigin = 'anonymous';
  else player.removeAttribute('crossorigin');
  player.src = item.videoUrl;
  if (item.captionsUrl) {
    const track = document.createElement('track');
    Object.assign(track, { kind: 'captions', srclang: 'es', label: 'Español', src: item.captionsUrl, default: true });
    player.append(track);
  }
  const isSermon = item.category === 'predicaciones';
  document.getElementById('player-heading').textContent = isSermon
    ? (item.id === latestId && confirmedDate(item) ? 'Último sermón' : 'Ver predicación')
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
  player.load();
  if (moveFocus) {
    document.getElementById('sermons-section').open = false;
    document.getElementById('older-sermons').open = false;
    document.getElementById('player-heading').focus();
    document.getElementById('sermon-content').scrollIntoView({ block: 'start' });
  }
}

function recordingChoice(item, startPlayback = false) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sermon-choice';
  button.dataset.id = item.id;
  button.setAttribute('aria-controls', 'sermon-content');
  const title = document.createElement('span');
  title.className = 'choice-title';
  title.textContent = `${item.number ? `${item.number}. ` : ''}${item.title}`;
  const meta = document.createElement('span');
  meta.className = 'choice-meta';
  meta.textContent = [item.passage, formatDate(item)].filter(Boolean).join(' · ');
  button.append(title, meta);
  button.addEventListener('click', () => {
    selectSermon(item, true);
    if (startPlayback) startVideo();
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
  label.textContent = confirmedDate(latest) ? 'Grabación más reciente con fecha confirmada' : 'Grabación disponible';
  const title = document.createElement('h3');
  title.className = 'recording-title';
  title.textContent = latest.title;
  const meta = document.createElement('p');
  meta.className = 'metadata';
  meta.textContent = [latest.speaker, formatDate(latest)].filter(Boolean).join(' · ');
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'primary-button school-play';
  play.textContent = 'Reproducir';
  play.setAttribute('aria-label', `Reproducir: ${latest.title}`);
  play.setAttribute('aria-controls', 'sermon-content');
  play.addEventListener('click', () => { selectSermon(latest, true); startVideo(); });
  container.append(label, title, meta, play);
  if (items.length > 1) {
    const older = document.createElement('details');
    older.className = 'older-recordings';
    const summary = document.createElement('summary');
    summary.textContent = 'Ver grabaciones anteriores';
    const list = document.createElement('ol');
    list.className = 'sermon-list';
    items.slice(1).forEach(item => list.append(recordingChoice(item, true)));
    older.append(summary, list);
    container.append(older);
  }
}

async function loadCatalog() {
  retryCatalog.hidden = true;
  catalogStatus.textContent = 'Cargando las predicaciones…';
  try {
    const response = await fetch('catalog.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Catalog unavailable');
    const catalog = await response.json();
    if (catalog.version !== 1 || !Array.isArray(catalog.sermons)) throw new Error('Invalid catalog');
    const recordings = catalog.sermons.filter(validRecording);
    const items = orderRecordings(recordings.filter(item => item.category === 'predicaciones'));
    if (!items.length) throw new Error('Empty catalog');
    latestId = items[0].id;
    const list = document.getElementById('sermon-list');
    list.replaceChildren();
    items.slice(0, 5).forEach(item => list.append(recordingChoice(item)));
    const olderList = document.getElementById('older-sermon-list');
    olderList.replaceChildren();
    items.slice(5).forEach(item => olderList.append(recordingChoice(item)));
    const olderSection = document.getElementById('older-sermons');
    olderSection.hidden = items.length <= 5;
    olderSection.open = false;
    for (const category of Object.keys(schoolCategories)) {
      renderSchoolCategory(category, orderRecordings(recordings.filter(item => item.category === category)));
    }
    document.getElementById('sermon-content').hidden = false;
    catalogStatus.textContent = '';
    selectSermon(items[0]);
  } catch {
    catalogStatus.textContent = 'No pudimos cargar las predicaciones. Revisa tu conexión y vuelve a intentarlo.';
    retryCatalog.hidden = false;
  }
}

async function startVideo() {
  playbackStatus.textContent = '';
  try { await player.play(); }
  catch {
    playbackStatus.textContent = 'No se pudo iniciar el video. Revisa tu conexión o usa el botón de reproducción del reproductor.';
    retryVideo.hidden = false;
  }
}
playButton.addEventListener('click', () => {
  if (!player.paused) player.pause();
  else startVideo();
});
player.addEventListener('play', () => { playButton.textContent = currentCategory === 'predicaciones' ? 'Ⅱ Pausar sermón' : 'Ⅱ Pausar'; });
player.addEventListener('pause', () => { playButton.textContent = playLabel(); });
player.addEventListener('ended', () => { playButton.textContent = '▶ Volver a escuchar'; });
player.addEventListener('playing', () => { playbackStatus.textContent = ''; retryVideo.hidden = true; });
player.addEventListener('error', () => {
  playbackStatus.textContent = 'No pudimos cargar este video. Revisa tu conexión y vuelve a intentarlo.';
  retryVideo.hidden = false;
});
retryVideo.addEventListener('click', () => {
  player.load();
  playbackStatus.textContent = 'Video recargado. Toca el botón de reproducción para intentarlo otra vez.';
  retryVideo.hidden = true;
});
retryCatalog.addEventListener('click', loadCatalog);
function updateConnection() { document.getElementById('connection-status').hidden = navigator.onLine; }
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();
loadCatalog();
