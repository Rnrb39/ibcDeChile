const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {interfaceWith}=require('./helpers/interface.cjs');
const catalog=require('../catalog.json');
const fixture=catalog.sermons.slice(0,4);

test('aviso temporal y Cerrar conservan catálogo, audio, vista y número de consultas',async()=>{
 const options={},app=await interfaceWith(fixture,options);
 app.ids['open-predicaciones'].click();app.ids['sermon-list'].children[0].children[0].click();
 app.ids['play-button'].click();app.player.metadata(600);app.player.currentTime=85;
 options.catalogError=true;await app.reload();
 assert.equal(app.ids['catalog-notice'].hidden,false);
 assert.match(app.ids['catalog-status'].textContent,/Puedes seguir escuchando/);
 const requests=app.fetches.length;
 app.ids['close-catalog-notice'].focus();app.ids['close-catalog-notice'].click();
 assert.equal(app.ids['catalog-notice'].hidden,true);assert.equal(app.ids['player-view'].hidden,false);
 assert.equal(app.ids['catalog-details'].hidden,false);assert.match(app.ids['catalog-last-status'].textContent,/No se pudo actualizar/);
 assert.equal(app.document.activeElement,app.ids['contenido']);
 assert.equal(app.player.paused,false);assert.equal(app.player.currentTime,85);assert.equal(app.fetches.length,requests);
 app.ids['retry-catalog'].click();assert.equal(app.fetches.length,requests); // Cooldown also applies to manual retries.
});

test('aviso caduca sin perder el estado accesible y no se repite por el mismo fallo',async()=>{
 const options={},app=await interfaceWith(fixture,options);
 options.catalogError=true;await app.reload();app.tick(12000);
 assert.equal(app.ids['catalog-notice'].hidden,true);assert.equal(app.ids['catalog-details'].hidden,false);
 assert.match(app.ids['catalog-announcement'].textContent,/Puedes seguir escuchando/);
 await app.reload();assert.equal(app.ids['catalog-notice'].hidden,true);
 delete options.catalogError;await app.reload();
 assert.equal(app.ids['catalog-last-status'].textContent,'El catálogo está actualizado.');
 options.catalogError=true;await app.reload();assert.equal(app.ids['catalog-notice'].hidden,false);
});

test('la caducidad no oculta Cerrar mientras tiene el foco',async()=>{
 const options={},app=await interfaceWith(fixture,options);options.catalogError=true;await app.reload();
 app.ids['close-catalog-notice'].focus();app.tick(12000);assert.equal(app.ids['catalog-notice'].hidden,false);
 app.ids['contenido'].focus();app.ids['close-catalog-notice'].emit('blur');app.tick(12000);
 assert.equal(app.ids['catalog-notice'].hidden,true);
});

test('recuperar conexión programa un solo reintento al terminar el límite de frecuencia',async()=>{
 const options={},app=await interfaceWith(fixture,options);options.catalogError=true;await app.reload();
 const requests=app.fetches.length;
 app.setOnline(false);app.setOnline(true);app.setOnline(true);app.tick(29999);
 assert.equal(app.fetches.length,requests);
 delete options.catalogError;app.tick(1);await new Promise(setImmediate);
 assert.equal(app.fetches.length,requests+1);assert.equal(app.ids['connection-status'].hidden,true);
 app.setOnline(true);app.tick(1000);assert.equal(app.fetches.length,requests+1);
});

test('un fallo del catálogo público en localhost no declara pérdida de internet',async()=>{
 const app=await interfaceWith(fixture,{url:'http://localhost:8771/app/',publicCatalog:{value:{}},publicError:true});
 assert.match(app.ids['catalog-status'].textContent,/vista local/);
 assert.equal(app.ids['connection-status'].hidden,true);
 app.ids['open-predicaciones'].click();
 assert.equal(app.ids['sermon-list'].children.length,3);
 assert.equal(app.player.src,'');
});

test('el error inicial permanece accesible después de cerrar el aviso',async()=>{
 const app=await interfaceWith([],{catalogError:true});
 app.ids['close-catalog-notice'].click();app.ids['open-predicaciones'].click();
 assert.equal(app.ids['library-empty'].hidden,false);
 assert.match(app.ids['library-empty'].textContent,/No se pudieron cargar/);
 assert.equal(app.ids['catalog-details'].hidden,false);
 assert.match(app.ids['catalog-last-status'].textContent,/No se pudieron cargar/);
});

test('predicador y fecha visibles conservan valores confirmados o fecha desconocida',async()=>{
 for(const item of [catalog.sermons[0],catalog.sermons.at(-1)]) {
  const app=await interfaceWith([item]);app.select(item);
  assert.ok(app.ids['sermon-meta'].textContent.includes(item.speaker));
  if(item.dateEstimated)assert.match(app.ids['sermon-meta'].textContent,/Fecha por confirmar/);
  else assert.match(app.ids['sermon-meta'].textContent,/18 de octubre de 2026/);
 }
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('id="sermon-meta"')<html.indexOf('<details class="message-options">'));
 assert.equal((html.match(/id="sermon-meta"/g)||[]).length,1);
});
