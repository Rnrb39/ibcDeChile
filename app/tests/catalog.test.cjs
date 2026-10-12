const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../catalog-utils.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../catalog.json'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Fixtures reuse a verified URL, never add records to the real catalog, and never fetch video.
function recording(id, category, date, extra = {}) {
  return { id, category, title: `Prueba ${id}`, date, videoUrl: catalog.sermons[0].videoUrl, ...extra };
}

async function interfaceWith(records) {
  const nodes = [];
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.hidden = false; this.open = false; this.textContent = ''; nodes.push(this); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    click() { for (const fn of this.events.click || []) fn(); }
    querySelectorAll(tag) { return this.children.filter(child => child.tag === tag); }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
  }
  const ids = Object.fromEntries([...html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"/g)].map(match => [match[2], new Element(match[1])]));
  const document = { getElementById: id => ids[id], createElement: tag => new Element(tag), querySelectorAll: () => nodes.filter(node => node.className === 'sermon-choice') };
  const player = ids.player;
  player.paused = true;
  player.pause = () => { player.paused = true; for (const fn of player.events.pause || []) fn(); };
  player.play = async () => { player.paused = false; for (const fn of player.events.play || []) fn(); };
  player.load = () => {};
  const context = vm.createContext({ IBCCatalog: model, document, navigator: { onLine: true }, window: { addEventListener() {} }, fetch: async () => ({ ok: true, json: async () => ({ version: 1, sermons: records }) }) });
  vm.runInContext(script, context);
  await new Promise(setImmediate);
  return { ids, player, document };
}

test('unknown, estimated and impossible dates are never displayed as confirmed', () => {
  for (const item of [{date:null}, {}, {date:'2099-01-01',dateEstimated:true}, {date:'2026-02-30'}, {date:'malformed'}]) {
    assert.equal(model.confirmedDate(item), null);
    assert.equal(model.formatDate(item), 'Fecha por confirmar');
  }
  assert.match(model.formatDate({date:'2026-10-04'}), /4 de octubre de 2026/);
  assert.equal(catalog.sermons.filter(item => item.date === null).length, 5);
});

test('estimated future date cannot outrank a confirmed recording', () => {
  const items = [recording('unknown','taller-biblico','2099-01-01',{dateEstimated:true}),recording('older','taller-biblico','2026-09-01'),recording('latest','taller-biblico','2026-10-01')];
  assert.deepEqual(model.orderRecordings(items).map(item=>item.id), ['latest','older','unknown']);
  assert.equal(model.validRecording(recording('no-date','taller-biblico',null)), true);
  assert.equal(model.validRecording({...items[0],videoUrl:'javascript:alert(1)'}), false);
});

test('real catalog shows five sermons and five collapsed older sermons', async () => {
  const {ids} = await interfaceWith(catalog.sermons);
  assert.equal(ids['sermon-list'].children.length,5);
  assert.equal(ids['older-sermon-list'].children.length,5);
  assert.equal(ids['older-sermons'].hidden,false);
  assert.equal(ids['older-sermons'].open,false);
  assert.equal(ids['sermon-title'].textContent,'Soportando la presión');
  for(const category of ['catecismo-confesion','taller-biblico']) {
    const content=ids[`${category}-recordings`];
    assert.equal(content.children.length,1);
    assert.equal(content.children[0].textContent,'Próximamente estarán disponibles las grabaciones');
    assert.equal(content.children[0].tag,'p');
  }
});

test('five or fewer sermons need no older toggle; unknown dates remain playable', async () => {
  const {ids,player} = await interfaceWith(catalog.sermons.slice(0,3));
  assert.equal(ids['older-sermons'].hidden,true);
  assert.equal(ids['player-heading'].textContent,'Sermón seleccionado');
  const choice=ids['sermon-list'].children[0].children[0];
  assert.match(choice.children[1].textContent,/Fecha por confirmar/);
  choice.click(); ids['play-button'].click();
  assert.equal(player.paused,false);
  assert.equal(player.src,catalog.sermons[2].videoUrl);
});

for(const category of ['catecismo-confesion','taller-biblico']) {
  test(`${category}: one recording offers playback without an empty older list`, async () => {
    const fixture=recording('only',category,null);
    const {ids,player}=await interfaceWith([...catalog.sermons,fixture]);
    const content=ids[`${category}-recordings`];
    assert.equal(content.children.some(node=>node.tag==='details'),false);
    assert.equal(content.children[0].textContent,'Grabación disponible');
    const play=content.children.find(node=>node.tag==='button');
    assert.equal(play.textContent,'Reproducir');
    play.click();
    assert.equal(player.src,fixture.videoUrl);
    assert.equal(player.paused,false);
    assert.equal(ids['latest-note'].hidden,true);
    assert.equal(ids['play-button'].textContent,'Ⅱ Pausar');
  });
  test(`${category}: newest recording and expandable older recordings share the player`, async () => {
    const records=[recording('old',category,'2026-09-01'),recording('new',category,'2026-10-01')];
    const {ids,player,document}=await interfaceWith([...catalog.sermons,...records]);
    const content=ids[`${category}-recordings`];
    assert.equal(content.children.find(node=>node.tag==='h3').textContent,'Prueba new');
    const older=content.children.find(node=>node.tag==='details');
    assert.equal(older.open,false);
    assert.equal(older.children[0].textContent,'Ver grabaciones anteriores');
    older.children[1].children[0].children[0].click();
    assert.equal(ids['sermon-title'].textContent,'Prueba old');
    assert.equal(player.paused,false);
    assert.equal(document.activeElement,ids['player-heading']);
  });
}
