const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../catalog.json');
const progress = require('../playback-progress.js');
const { interfaceWith, memoryStorage } = require('./helpers/interface.cjs');
const NOW = Date.parse('2026-10-12T12:00:00Z');
const categories = ['predicaciones', 'catecismo-confesion', 'taller-biblico'];

// Fictional school metadata lives only in this test. URLs reuse existing public
// audios; the harness simulates media and never downloads them or writes a catalog.
const school = ['catecismo-confesion','taller-biblico'].flatMap((category,index) => [1,2].map(number => ({
  id:`fixture-${category}-${number}`, category,
  title:`Grabación ficticia ${category} ${number}`,
  series:`Serie ficticia ${category}`, number,
  date:number === 1 ? '2026-10-05' : '2026-10-12',
  audioVersion:`fixture-${category}-${number}-v1`,
  audioUrl:catalog.sermons[index].audioUrl
})));
const records = [...catalog.sermons,...school];
const items = Object.fromEntries(categories.map(category=>[category,
  category==='predicaciones' ? catalog.sermons.at(-1) : school.find(item=>item.category===category && item.number===2)
]));

function saved(storage) { const raw=storage.getItem(progress.KEY);return raw ? JSON.parse(raw) : null; }
function seed(item, position=75) {
  const storage=memoryStorage();
  progress.createStore(()=>storage,()=>NOW).save(item,position,300);
  return storage;
}

for (const category of categories) {
  const item=items[category];

  test(`${category}: ±15 seconds works while paused or playing without starting playback`, async () => {
    const app=await interfaceWith(records,{now:NOW});
    app.select(item);app.ids['play-button'].click();app.player.metadata(300);app.player.pause();
    assert.equal(app.player.playCalls,1);assert.equal(app.player.paused,true);
    app.player.currentTime=5;app.ids['seek-back'].click();assert.equal(app.player.currentTime,0);
    app.player.currentTime=40;app.ids['seek-forward'].click();assert.equal(app.player.currentTime,55);
    assert.equal(app.player.playCalls,1);assert.equal(app.player.paused,true);
    app.ids['play-button'].click();
    app.ids['seek-back'].click();assert.equal(app.player.currentTime,40);assert.equal(app.player.paused,false);
    app.ids['seek-forward'].click();assert.equal(app.player.currentTime,55);assert.equal(app.player.paused,false);
    app.player.pause();
    assert.equal(saved(app.storage).id,item.id);assert.equal(saved(app.storage).position,55);
    assert.equal(saved(app.storage).mediaVersion,progress.audioVersion(item));
  });

  test(`${category}: reopening restores both choices, continue and restart only follow a click`, async () => {
    const storage=seed(item);
    const app=await interfaceWith(records,{now:NOW,storage});
    assert.equal(app.player.playCalls,0);assert.equal(app.player.paused,true);
    assert.equal(app.ids['resume-panel'].hidden,false);
    assert.equal(app.ids['resume-title'].textContent,item.title);
    assert.equal(app.ids['resume-play'].textContent,'Continuar desde 01:15');
    app.ids['resume-play'].click();app.player.metadata(300);
    assert.equal(app.player.src,item.audioUrl);assert.equal(app.player.currentTime,75);
    assert.equal(app.player.playCalls,1);assert.equal(app.player.paused,false);
    assert.equal(app.ids['sermon-title'].textContent,item.title);
    assert.equal(app.document.activeElement,app.ids['sermon-title']);
    app.player.pause();app.ids['restart-play'].click();app.player.metadata(300);
    assert.equal(app.player.currentTime,0);assert.equal(app.player.playCalls,2);
    assert.equal(saved(storage),null);
  });

  test(`${category}: 30-second threshold, end margin and ended are honored`, async () => {
    const app=await interfaceWith(records,{now:NOW});
    app.select(item);app.ids['play-button'].click();app.player.metadata(300);
    app.player.currentTime=29;app.player.pause();assert.equal(app.ids['resume-panel'].hidden,true);
    app.ids['play-button'].click();app.player.currentTime=30;app.player.pause();
    assert.equal(app.ids['resume-panel'].hidden,false);
    assert.equal(app.ids['resume-play'].textContent,'Continuar desde 00:30');
    app.ids['play-button'].click();app.player.currentTime=270;app.player.pause();
    assert.equal(saved(app.storage),null);assert.equal(app.ids['resume-panel'].hidden,true);
    app.ids['play-button'].click();app.player.currentTime=100;app.tick(10000);
    assert.equal(saved(app.storage).id,item.id);
    app.player.emit('ended');assert.equal(saved(app.storage),null);
    assert.equal(app.ids['resume-panel'].hidden,true);
  });

  test(`${category}: background saves and storage errors do not stop audio`, async () => {
    const app=await interfaceWith(records,{now:NOW});
    app.select(item);app.ids['play-button'].click();app.player.metadata(300);
    app.player.currentTime=65;app.hide();
    assert.equal(app.player.paused,false);assert.equal(saved(app.storage).id,item.id);
    assert.equal(saved(app.storage).position,65);
    const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}};
    const blocked=await interfaceWith(records,{now:NOW,storage:denied});
    blocked.select(item);blocked.ids['play-button'].click();blocked.player.metadata(300);
    blocked.player.currentTime=65;blocked.hide();
    assert.equal(blocked.player.paused,false);
    assert.match(blocked.ids['progress-status'].textContent,/no se puede asegurar/);
  });
}

for (const from of categories) for (const to of categories.filter(category=>category!==from)) {
  test(`category change ${from} → ${to} preserves outgoing progress and requires explicit playback`, async () => {
    const app=await interfaceWith(records,{now:NOW});
    app.select(items[from]);app.ids['play-button'].click();app.player.metadata(300);
    app.player.currentTime=85;
    const playCalls=app.player.playCalls;
    app.select(items[to]);app.player.metadata(300);
    assert.equal(app.player.playCalls,playCalls);assert.equal(app.player.paused,true);
    assert.equal(saved(app.storage).id,items[from].id);
    assert.equal(saved(app.storage).position,85);
    assert.equal(saved(app.storage).mediaVersion,progress.audioVersion(items[from]));
    // The outgoing position cannot be applied to the newly selected category.
    assert.equal(app.player.currentTime,0);
    assert.equal(app.ids['resume-title'].textContent,items[from].title);
    app.pagehide();assert.equal(saved(app.storage).id,items[from].id);
    app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=95;app.player.pause();
    assert.equal(saved(app.storage).id,items[to].id);
    assert.equal(saved(app.storage).position,95);
    assert.equal(saved(app.storage).mediaVersion,progress.audioVersion(items[to]));
    const reopened=await interfaceWith(records,{now:NOW,storage:app.storage});
    assert.equal(reopened.player.playCalls,0);assert.equal(reopened.player.paused,true);
    assert.equal(reopened.ids['resume-title'].textContent,items[to].title);
    assert.equal(reopened.ids['resume-play'].textContent,'Continuar desde 01:35');
  });
}

for(const category of categories.filter(value=>value!=='predicaciones'))test(category+': cambiar desde la biblioteca guarda el mensaje saliente sin reproducir el nuevo',async()=>{
 const app=await interfaceWith(records,{now:NOW});
 app.select(items.predicaciones);app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=70;
 app.ids['player-back'].click();app.ids['library-back'].click();app.ids['open-'+category].click();
 const selected=app.ids['sermon-list'].children[0].children[0];
 selected.click();assert.equal(app.player.playCalls,1);assert.equal(app.player.paused,true);assert.equal(app.player.src,'');
 assert.equal(saved(app.storage).id,items.predicaciones.id);assert.equal(saved(app.storage).position,70);
 app.ids['play-button'].click();app.player.metadata(300);app.player.currentTime=90;app.player.pause();
 assert.equal(saved(app.storage).id,selected.dataset.id);
});

test('category fixtures never become public catalog entries', () => {
  assert.equal(catalog.sermons.length,12);
  assert.ok(catalog.sermons.every(item=>item.category==='predicaciones' && !item.id.startsWith('fixture-')));
});
