const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../catalog.json');
const model = require('../playback-progress.js');
const { interfaceWith, memoryStorage } = require('./helpers/interface.cjs');
const NOW = Date.parse('2026-10-12T12:00:00Z');
const latest = catalog.sermons[10];
const older = catalog.sermons[9];
const record = (item=latest, overrides={}) => ({schemaVersion:1,mediaType:'audio',id:item.id,position:45,duration:300,mediaVersion:model.audioVersion(item),updatedAt:new Date(NOW).toISOString(),...overrides});
const seed = value => memoryStorage({[model.KEY]:JSON.stringify(value)});

test('stores only one checkpoint with identity, audio version, position and timestamp', () => {
  const storage=memoryStorage();const store=model.createStore(()=>storage,()=>NOW);
  assert.equal(store.save(latest,45,300),true);
  assert.deepEqual(store.load(),record());
  store.save(older,60,400);
  assert.equal(store.load().id,older.id);
  assert.equal(storage.data.size,1);
  assert.equal(model.audioVersion({...latest,audioVersion:'revision-2'}),'revision-2');
});

test('30 seconds is significant; the last 30 seconds counts as finished', () => {
  assert.equal(model.resumable(record(latest,{position:29.9})),false);
  assert.equal(model.resumable(record(latest,{position:30})),true);
  assert.equal(model.resumable(record(latest,{position:269.9})),true);
  assert.equal(model.resumable(record(latest,{position:270})),false);
  const storage=seed(record());const store=model.createStore(()=>storage,()=>NOW);
  store.save(latest,270,300);
  assert.equal(store.load(),null);
});

test('expires at 90 days and cleans up corrupt, old and invalid records', () => {
  const invalid=[null,{},record(latest,{schemaVersion:0}),record(latest,{position:-1}),record(latest,{position:301}),record(latest,{duration:0}),record(latest,{mediaVersion:''}),record(latest,{updatedAt:'invalid'}),record(latest,{updatedAt:'2026-02-31T12:00:00.000Z'}),record(latest,{updatedAt:new Date(NOW-model.MAX_AGE).toISOString()}),record(latest,{updatedAt:new Date(NOW+3600000).toISOString()})];
  for(const value of invalid) {
    const storage=seed(value);const store=model.createStore(()=>storage,()=>NOW);
    assert.equal(store.load(),null);assert.equal(storage.data.has(model.KEY),false);
  }
  const storage=memoryStorage({[model.KEY]:'{broken'});
  assert.equal(model.createStore(()=>storage,()=>NOW).load(),null);
  assert.equal(storage.data.has(model.KEY),false);
  assert.equal(model.valid(record(latest,{updatedAt:new Date(NOW-model.MAX_AGE+1).toISOString()}),NOW),true);
  assert.equal(model.valid(record(latest,{position:Infinity}),NOW),false);
});

test('missing content and changed audio version invalidate the saved position', () => {
  for(const items of [[],[{...latest,audioVersion:'changed-r2-etag'}],[{...latest,audioVersion:'revision-2'}]]) {
    const storage=seed(record());const store=model.createStore(()=>storage,()=>NOW);
    assert.equal(store.find(items),null);assert.equal(storage.data.has(model.KEY),false);
  }
});

test('read, write, remove and localStorage access failures never throw', () => {
  const storage={getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}};
  const store=model.createStore(()=>storage,()=>NOW);
  assert.doesNotThrow(()=>store.load());assert.doesNotThrow(()=>store.save(latest,45,300));assert.doesNotThrow(()=>store.clear());assert.equal(store.failed,true);
  const getter=model.createStore(()=>{throw Error('blocked getter');},()=>NOW);
  assert.doesNotThrow(()=>getter.save(latest,45,300));assert.doesNotThrow(()=>getter.load());assert.equal(getter.failed,true);
});

test('seek controls clamp at zero and duration; bad metadata stays disabled', async () => {
  assert.equal(model.seekPosition(5,-15,300),0);assert.equal(model.seekPosition(295,15,300),300);
  assert.equal(model.seekPosition(45,15,NaN),null);
  const {ids,player}=await interfaceWith(catalog.sermons,{now:NOW});
  assert.equal(ids['seek-back'].disabled,true);assert.equal(ids['seek-forward'].disabled,true);
  ids['play-button'].click();player.metadata(300);player.pause();
  player.currentTime=5;ids['seek-back'].click();assert.equal(player.currentTime,0);
  player.currentTime=295;ids['seek-forward'].click();assert.equal(player.currentTime,300);
  assert.equal(player.playCalls,1);assert.equal(player.paused,true);
});

test('reopening offers both choices and never starts playback automatically', async () => {
  const {ids,player}=await interfaceWith(catalog.sermons,{now:NOW,storage:seed(record(older,{position:75}))});
  assert.equal(player.playCalls,0);assert.equal(player.paused,true);
  assert.equal(player.src,'');
  assert.equal(ids['resume-panel'].hidden,false);
  assert.equal(ids['resume-title'].textContent,older.title);
  assert.equal(ids['resume-play'].textContent,'Continuar desde 01:15');
  assert.equal(ids['restart-play'].textContent,'Escuchar desde el principio');
});

test('continue restores only the chosen audio after metadata and restart removes old progress', async () => {
  const storage=seed(record(older,{position:75}));
  const app=await interfaceWith(catalog.sermons,{now:NOW,storage});
  app.ids['resume-play'].click();assert.equal(app.player.src,older.audioUrl);assert.equal(app.player.playCalls,1);
  app.player.metadata(300);assert.equal(app.player.currentTime,75);
  app.player.pause();assert.equal(app.ids['resume-panel'].hidden,false);
  app.ids['restart-play'].click();app.player.metadata(300);
  assert.equal(app.player.currentTime,0);assert.equal(app.player.playCalls,2);
  assert.equal(storage.data.has(model.KEY),false);
});

test('changing message saves the outgoing ID; selecting an unplayed one cannot overwrite it', async () => {
  const app=await interfaceWith(catalog.sermons,{now:NOW});
  app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=75;
  app.ids['sermon-list'].children[1].children[0].click();
  const stored=JSON.parse(app.storage.getItem(model.KEY));
  assert.equal(stored.id,latest.id);assert.equal(stored.position,75);
  app.player.metadata(300);app.tick(10000);app.pagehide();
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).id,latest.id);
  app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=40;app.player.pause();
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).id,older.id);
});

test('periodic, hidden and pagehide checkpoints do not pause background audio', async () => {
  const app=await interfaceWith(catalog.sermons,{now:NOW});
  app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=45;app.tick(10000);
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).position,45);
  app.player.currentTime=55;app.hide();assert.equal(app.player.paused,false);
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).position,55);
  app.player.currentTime=65;app.pagehide();assert.equal(app.player.paused,false);
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).position,65);
});

test('media timeupdate checkpoints are throttled and also survive a new app instance', async () => {
  const app=await interfaceWith(catalog.sermons,{now:NOW});
  app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=35;
  app.player.emit('timeupdate');assert.equal(app.storage.getItem(model.KEY),null);
  app.advanceClock(10000);app.player.emit('timeupdate');
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).position,35);
  app.player.currentTime=40;app.player.emit('timeupdate');
  assert.equal(JSON.parse(app.storage.getItem(model.KEY)).position,35);
  const reopened=await interfaceWith(catalog.sermons,{now:NOW+11000,storage:app.storage});
  assert.equal(reopened.player.playCalls,0);
  assert.equal(reopened.ids['resume-play'].textContent,'Continuar desde 00:35');
});

test('ended and the end margin clear continuation without offering the final position', async () => {
  const app=await interfaceWith(catalog.sermons,{now:NOW});
  app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=45;app.player.pause();
  assert.equal(app.ids['resume-panel'].hidden,false);
  app.ids['play-button'].click();app.player.currentTime=270;app.player.pause();
  assert.equal(app.ids['resume-panel'].hidden,true);assert.equal(app.storage.data.has(model.KEY),false);
  app.ids['play-button'].click();app.player.currentTime=100;app.tick(10000);
  app.player.emit('ended');assert.equal(app.storage.data.has(model.KEY),false);
  assert.equal(app.ids['resume-panel'].hidden,true);
});

test('a changed actual duration invalidates resume and waits for a new user action', async () => {
  const app=await interfaceWith(catalog.sermons,{now:NOW,storage:seed(record())});
  app.ids['resume-play'].click();app.player.metadata(200);
  assert.equal(app.player.paused,true);assert.equal(app.storage.data.has(model.KEY),false);
  assert.match(app.ids['playback-status'].textContent,/ya no corresponde/);
});

test('late metadata from another selection cannot apply an old resume', async () => {
  const app=await interfaceWith(catalog.sermons,{now:NOW,storage:seed(record())});
  app.ids['resume-play'].click();app.ids['sermon-list'].children[1].children[0].click();
  app.player.metadata(300);
  assert.equal(app.player.src,'');assert.equal(app.player.currentTime,0);
  assert.equal(app.player.paused,true);
});

test('storage or play failures keep the player usable and preserve a pending checkpoint', async () => {
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}};
  const app=await interfaceWith(catalog.sermons,{now:NOW,storage:denied});
  app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=45;app.player.pause();
  assert.match(app.ids['progress-status'].textContent,/no se puede asegurar/);
  app.ids['play-button'].click();assert.equal(app.player.paused,false);
  const rejected=await interfaceWith(catalog.sermons,{now:NOW,storage:seed(record()),playError:true});
  rejected.ids['resume-play'].click();await new Promise(setImmediate);
  assert.equal(rejected.player.paused,true);
  assert.equal(JSON.parse(rejected.storage.getItem(model.KEY)).position,45);
  assert.match(rejected.ids['playback-status'].textContent,/No se pudo iniciar/);
});
