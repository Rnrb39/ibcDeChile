const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('../catalog.json');
const legacyCatalog = require('./fixtures/catalog-video-v1.json');
const progress = require('../playback-progress.js');
const model = require('../audio-catalog.js');
const {interfaceWith, memoryStorage} = require('./helpers/interface.cjs');
const NOW = Date.parse('2026-10-16T12:00:00Z');
const scope = 'https://ibcdechile.org/app/';
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const choices = app => app.ids['sermon-list'].children.map(li=>li.children[0]);
function choose(app,id){while(!app.ids['previous-group'].disabled)app.ids['previous-group'].click();let button;for(let page=0;page<100;page++){button=choices(app).find(candidate=>candidate.dataset.id===id);if(button){button.click();return;}if(app.ids['next-group'].disabled)break;app.ids['next-group'].click();}throw Error('Message unavailable');}

test('twelve permanent IDs, original confirmed metadata and explicit R2 MP3 revisions', () => {
  assert.equal(catalog.sermons.length,12);
  assert.equal(new Set(catalog.sermons.map(item=>item.id)).size,12);
  for(const [index, item] of catalog.sermons.entries()) {
    const id = `colosenses-${String(index+1).padStart(2,'0')}`;
    assert.equal(item.id,id);
    assert.equal(item.audioUrl,`https://videos.ibcdechile.org/audio/${id}.mp3`);
    assert.match(item.audioVersion,/^r2-etag:[a-f0-9]{32}$/);
    assert.ok(item.audioSizeBytes>0);
    assert.equal(item.videoUrl,undefined);
    assert.equal(item.category,'predicaciones');
    if(index<10) {
      const original = {...legacyCatalog.sermons[index]};
      delete original.videoUrl;
      const {audioUrl,audioVersion,audioSizeBytes,audioDurationSeconds,...metadata} = item;
      assert.deepEqual(metadata,original);
    }
  }
  assert.equal(catalog.sermons[10].title,'Completos en Él');
  assert.equal(catalog.sermons[10].date,'2026-10-11');
  const latest = catalog.sermons[11];
  assert.equal(latest.title,'El ayer y el hoy');
  assert.equal(latest.passage,'Colosenses 2:11–15');
  assert.equal(latest.date,'2026-10-18');
  assert.equal(latest.dateEstimated,false);
  assert.equal(latest.speaker,'Pastor Sergio Arias Cáceres');
});

{
  test('opening and every sermon selection never request media or local configuration',async()=>{
    const app=await interfaceWith(catalog.sermons,{now:NOW});
    assert.deepEqual(app.fetches,['catalog.json']);
    assert.equal(app.ids['sermon-title'].textContent,'El ayer y el hoy');
    assert.equal(app.ids['series-list'].children.length,1);
    assert.ok(app.ids['sermon-list'].children.length<=5);
    for(const item of catalog.sermons) {
      choose(app,item.id);
      assert.equal(app.player.src,'');
      assert.equal(app.player.loadCalls,0);
      assert.equal(app.player.playCalls,0);
      assert.equal(app.mediaAssignments.length,0);
    }
  });
}

for(const item of catalog.sermons) {
  test(`${item.id}: explicit audio playback, ±15, resume, restart and switching without autoplay`,async()=>{
    const app=await interfaceWith(catalog.sermons,{now:NOW});
    choose(app,item.id);
    assert.equal(app.player.src,'');assert.equal(app.player.playCalls,0);
    app.ids['play-button'].click();app.player.metadata(600);
    assert.equal(app.player.src,item.audioUrl);
    app.ids['seek-forward'].click();assert.equal(app.player.currentTime,15);
    app.ids['seek-back'].click();assert.equal(app.player.currentTime,0);
    app.player.currentTime=75;app.hide();app.pagehide();
    assert.equal(app.player.paused,false);
    app.player.pause();
    const record=JSON.parse(app.storage.getItem(progress.KEY));
    assert.equal(record.id,item.id);assert.equal(record.mediaVersion,item.audioVersion);
    const reopened=await interfaceWith(catalog.sermons,{now:NOW,storage:app.storage});
    assert.equal(reopened.player.src,'');assert.equal(reopened.player.playCalls,0);
    reopened.ids['resume-play'].click();reopened.player.metadata(600);
    assert.equal(reopened.player.src,item.audioUrl);assert.equal(reopened.player.currentTime,75);
    reopened.player.pause();reopened.ids['restart-play'].click();reopened.player.metadata(600);
    assert.equal(reopened.player.currentTime,0);
    reopened.player.currentTime=90;
    const next=catalog.sermons.find(candidate=>candidate.id!==item.id);
    const previousRequests=reopened.mediaAssignments.length;
    choose(reopened,next.id);
    assert.equal(reopened.player.src,'');assert.equal(reopened.player.paused,true);
    assert.equal(reopened.mediaAssignments.length,previousRequests);
    assert.equal(JSON.parse(reopened.storage.getItem(progress.KEY)).id,item.id);
    assert.equal(JSON.parse(reopened.storage.getItem(progress.KEY)).position,90);
  });
}

for(const failure of [{catalogError:true},{catalogStatus:404},{catalogStatus:503},{catalogInvalid:true}]) {
  test(`catalog failure ${JSON.stringify(failure)} is recoverable without media requests`,async()=>{
    const options={now:NOW,...failure};
    const app=await interfaceWith(catalog.sermons,options);
    assert.equal(app.ids['retry-catalog'].hidden,false);
    assert.match(app.ids['catalog-status'].textContent,/No pudimos cargar/);
    assert.equal(app.player.src,'');assert.equal(app.player.playCalls,0);
    for(const key of Object.keys(failure))delete options[key];
    app.ids['retry-catalog'].click();await new Promise(setImmediate);
    assert.equal(app.ids['retry-catalog'].hidden,true);
    assert.equal(app.ids['sermon-title'].textContent,'El ayer y el hoy');
    assert.equal(app.mediaAssignments.length,0);
  });
}

test('connection interruption preserves progress, never resumes on reconnection and requires explicit retry',async()=>{
  const app=await interfaceWith(catalog.sermons,{now:NOW});
  app.ids['play-button'].click();app.player.metadata(600);app.player.currentTime=85;
  app.setOnline(false);app.hide();
  assert.equal(app.player.paused,false);
  app.player.pause();app.player.emit('error');
  assert.equal(app.ids['retry-audio'].hidden,false);
  assert.match(app.ids['playback-status'].textContent,/No pudimos cargar este audio/);
  assert.equal(JSON.parse(app.storage.getItem(progress.KEY)).position,85);
  const previousCalls=app.player.playCalls;
  app.setOnline(true);
  assert.equal(app.player.playCalls,previousCalls);
  assert.equal(app.player.paused,true);
  app.ids['resume-play'].click();app.player.metadata(600);
  assert.equal(app.player.currentTime,85);
});

test('the video checkpoint is not reused or erased by the audio release',async()=>{
  const storage=memoryStorage();
  const legacyKey='ibc-pwa:last-playback:v1';
  const videoRecord={schemaVersion:1,id:legacyCatalog.sermons[0].id,position:75,duration:600,videoVersion:`url:${legacyCatalog.sermons[0].videoUrl}`,updatedAt:new Date(NOW).toISOString()};
  const before=JSON.stringify(videoRecord);
  storage.setItem(legacyKey,before);
  const app=await interfaceWith(catalog.sermons,{now:NOW,storage});
  assert.notEqual(progress.KEY,legacyKey);
  assert.equal(app.ids['resume-panel'].hidden,true);
  assert.equal(storage.getItem(legacyKey),before);
  storage.setItem(progress.KEY,JSON.stringify(videoRecord));
  assert.equal(progress.createStore(()=>storage,()=>NOW).load(),null);
});

test('an empty or legacy-only catalog offers retry without loading MP4',async()=>{
  for(const records of [[],legacyCatalog.sermons]) {
    const app=await interfaceWith(records,{now:NOW});
    assert.equal(app.ids['retry-catalog'].hidden,false);
    assert.equal(app.player.src,'');
    assert.equal(app.mediaAssignments.length,0);
  }
});

test('installed identity and /app/ scope are preserved; audio shell has no preload or MP4 fallback',()=>{
  const manifest=JSON.parse(read('manifest.webmanifest'));
  for(const key of ['id','scope','start_url'])assert.equal(new URL(manifest[key],scope).href,scope);
  assert.equal(manifest.name,'IBC de Chile · Predicaciones');
  assert.equal(manifest.display,'standalone');
  const html=read('index.html');
  assert.match(html,/<audio[^>]*preload="none"/);
  assert.doesNotMatch(html,/<video\b|<source\b|\bautoplay\b|<link[^>]*rel="(?:preload|prefetch)"/i);
  assert.doesNotMatch(html.match(/<audio[^>]*>/)[0],/\bsrc=/);
  assert.equal(model.prepare(legacyCatalog,[],scope).filter(model.hasAudio).length,0);
  assert.equal(model.resolveAudioUrl('https://videos.ibcdechile.org/colosenses-11.mp4',scope),null);
});

test('production resources and tests are independent of the excluded prototype and local media',()=>{
  for(const file of ['index.html','app.js','audio-catalog.js','library.js','views.js','pwa.js','sw.js','manifest.webmanifest','catalog.json']) {
    const source=read(file);
    assert.doesNotMatch(source,/["'`][A-Za-z]:[\\/]|file:\/\/|xampp|ibcDeChile\//i);
    assert.doesNotMatch(source,/["'`](?:\.\.\/|\.\/)?(?:app\/)?audio\/|local\/catalog\.local\.json/);
  }
  for(const url of ['local/colosenses-01.mp3','http://localhost/test.mp3','file:///tmp/test.mp3','https://192.168.1.10/test.mp3'])assert.equal(model.resolveAudioUrl(url),null);
  for(const [,reference] of read('index.html').matchAll(/(?:src|href)="([^"]+)"/g)) {
    if(reference.startsWith('#'))continue;
    const url=new URL(reference,scope);
    assert.ok(url.href.startsWith(scope) || ['../catalogo-config.js','../catalogo-publico.js'].includes(reference));
    assert.ok(!url.pathname.startsWith('/app/audio/'));
    assert.ok(fs.existsSync(path.join(__dirname,'..',reference)));
  }
});

test('video-to-audio upgrade precaches a complete new shell before deleting only old app caches',async()=>{
  const events={},stored=new Map(),deleted=[];let cacheName;
  const oldNames=['ibc-pwa-/app/-v6','ibc-pwa-/app/-v5','ibc-audio-prototype-/app/audio/-v2','public-site-cache'];
  vm.runInNewContext(read('sw.js'),{
    URL,Request,Response,AbortController,setTimeout,clearTimeout,
    self:{registration:{scope},addEventListener:(type,fn)=>events[type]=fn},
    caches:{open:async name=>{cacheName=name;return {addAll:async requests=>{for(const request of requests){const pathname=new URL(request.url).pathname;const file=pathname==='/app/'?'index.html':pathname.startsWith('/app/')?pathname.slice(5):'../'+pathname.slice(1);assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);stored.set(request.url,read(file));}},match:async request=>stored.has(request.url)?new Response(stored.get(request.url)):undefined};},keys:async()=>[...oldNames,cacheName],delete:async name=>deleted.push(name)},
    fetch:async()=>{throw Error('offline after upgrade');}
  });
  let pending;events.install({waitUntil:task=>pending=task});await pending;
  assert.equal(cacheName,'ibc-pwa-/app/-v13-vistas-accesibles');
  assert.match(stored.get(scope),/<audio\b/);assert.doesNotMatch(stored.get(scope),/<video\b/);
  assert.equal(JSON.parse(stored.get(scope+'catalog.json')).sermons.length,12);
  assert.ok(stored.has(scope+'audio-catalog.js') && stored.has(scope+'audio.css'));
  events.activate({waitUntil:task=>pending=task});await pending;
  assert.deepEqual(deleted,['ibc-pwa-/app/-v6','ibc-pwa-/app/-v5']);
  let response;events.fetch({request:new Request(scope),respondWith:task=>response=task});
  assert.match(await (await response).text(),/<audio\b/);
  for(const item of catalog.sermons) {
    let intercepted=false;
    events.fetch({request:new Request(item.audioUrl),respondWith:()=>intercepted=true});
    assert.equal(intercepted,false);
  }
});
