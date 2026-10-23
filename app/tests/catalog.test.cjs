const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { interfaceWith } = require('./helpers/interface.cjs');
const model = require('../audio-catalog.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../catalog.json'), 'utf8'));

// Fixtures reuse a verified URL, never add records to the real catalog, and never fetch video.
function recording(id, category, date, extra = {}) {
  return { id, category, title: `Prueba ${id}`, date, audioUrl: catalog.sermons[0].audioUrl, audioVersion: catalog.sermons[0].audioVersion, ...extra };
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
  assert.equal(model.hasAudio(model.prepare({version:1,sermons:[{...items[0],audioUrl:'javascript:alert(1)'}]},[],'https://ibcdechile.org/app/')[0]), false);
});

test('catálogo real: inicio y categorías vacías sin controles de reproducción falsos',async()=>{
 const {ids}=await interfaceWith(catalog.sermons);
 assert.equal(ids['home-view'].hidden,false);
 for(const category of ['catecismo-confesion','taller-biblico']) {
  ids['open-'+category].click();
  assert.equal(ids['library-empty'].hidden,false);
  assert.equal(ids['library-empty'].textContent,'Próximamente estarán disponibles las grabaciones');
  assert.equal(ids['sermon-list'].children.length,0);
 }
});
test('fechas desconocidas permanecen explícitas en los detalles del mensaje',async()=>{
 const {ids,player}=await interfaceWith(catalog.sermons.slice(0,3));
 ids['open-predicaciones'].click();ids['sermon-list'].children[0].children[0].click();
 assert.match(ids['sermon-meta'].textContent,/Fecha por confirmar/);
 assert.equal(player.src,'');ids['play-button'].click();assert.equal(player.src,catalog.sermons[0].audioUrl);
});
for(const category of ['catecismo-confesion','taller-biblico'])test(category+': selección de grabaciones y reproducción explícita en la vista compartida',async()=>{
 const records=[recording('old',category,'2026-09-01'),recording('new',category,'2026-10-01')];
 const {ids,player,document}=await interfaceWith([...catalog.sermons,...records]);
 ids['open-'+category].click();assert.equal(ids['sermon-list'].children.length,2);
 ids['sermon-list'].children[0].children[0].click();
 assert.equal(ids['sermon-title'].textContent,'Prueba old');assert.equal(player.src,'');assert.equal(player.playCalls,0);
 ids['play-button'].click();assert.equal(player.paused,false);assert.equal(ids['play-button'].getAttribute('aria-label'),'Pausar');
 assert.equal(document.activeElement,ids['sermon-title']);
});
