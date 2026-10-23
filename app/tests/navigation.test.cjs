const test=require('node:test');
const assert=require('node:assert/strict');
const {interfaceWith,memoryStorage}=require('./helpers/interface.cjs');
const library=require('../library.js');
const catalog=require('../catalog.json');
const progress=require('../playback-progress.js');
const base=catalog.sermons[0];
const records=(count,category='predicaciones')=>Array.from({length:count},(_,i)=>({...base,id:`fixture-${category}-${i+1}`,category,series:'Serie de prueba',number:category==='catecismo-confesion'?null:i+1,catechismQuestion:category==='catecismo-confesion'?75+i*2:null,title:`Mensaje de prueba ${i+1}`,date:'2026-10-20',dateEstimated:false}));
const listed=app=>app.ids['sermon-list'].children.map(li=>li.children[0]);
const view=(app,name)=>{for(const candidate of ['home','library','player'])assert.equal(app.ids[candidate+'-view'].hidden,candidate!==name);};

for(const category of ['predicaciones','catecismo-confesion','taller-biblico'])for(const count of [1,5,6,12,35])test(`vistas ${category}: ${count} grabaciones, paginación, volver y selección sin reproducción`,async()=>{
 const data=records(count,category),ordered=library.sequence(data),app=await interfaceWith(data);
 view(app,'home');assert.equal(app.player.src,'');assert.equal(app.player.playCalls,0);
 app.ids['open-'+category].click();view(app,'library');
 assert.equal(app.ids['series-list'].hidden,true); // A sole series needs no intermediate screen.
 const pages=Math.ceil(count/library.PAGE_SIZE);
 for(let page=0;page<pages;page++) {
  assert.deepEqual(listed(app).map(button=>button.dataset.id),ordered.slice(page*library.PAGE_SIZE,(page+1)*library.PAGE_SIZE).map(item=>item.id));
  assert.equal(app.ids['message-range'].textContent,`Página ${page+1}`);
  assert.equal(app.ids['previous-group'].disabled,page===0);assert.equal(app.ids['next-group'].disabled,page===pages-1);
  assert.equal(app.ids['previous-group'].textContent,'Anterior');assert.equal(app.ids['next-group'].textContent,'Siguiente');
  app.ids['next-group'].click();
 }
 const chosen=ordered.at(-1);listed(app).at(-1).click();view(app,'player');
 assert.equal(app.ids['sermon-title'].textContent,chosen.title);assert.equal(app.player.src,'');assert.equal(app.player.playCalls,0);
 assert.equal(app.document.activeElement,app.ids['sermon-title']);
 app.ids['player-back'].click();view(app,'library');
 assert.ok(listed(app).some(button=>button.dataset.id===chosen.id));
 for(let page=pages-1;page>0;page--)app.ids['previous-group'].click();
 app.ids['previous-group'].click();assert.equal(app.ids['previous-group'].disabled,true);
 app.ids['library-back'].click();view(app,'home');
});

test('varias series usan el mismo selector paginado y permiten volver sin tocar el audio',async()=>{
 const data=records(4).map((item,i)=>({...item,series:`Serie ${i+1}`})),app=await interfaceWith(data);
 app.select(data[0]);app.ids['play-button'].click();app.player.metadata(600);app.player.currentTime=75;
 const loads=app.player.loadCalls,plays=app.player.playCalls;
 app.ids['player-back'].click();app.ids['library-back'].click();
 assert.equal(app.ids['series-list'].hidden,false);assert.equal(app.ids['series-list'].children.length,3);
 app.ids['next-group'].click();assert.equal(app.ids['series-list'].children.length,1);
 app.ids['series-list'].children[0].click();assert.equal(app.ids['library-heading'].textContent,'Serie 4');
 assert.equal(app.player.currentTime,75);assert.equal(app.player.paused,false);assert.equal(app.player.loadCalls,loads);assert.equal(app.player.playCalls,plays);
 app.ids['library-back'].click();assert.equal(app.ids['series-list'].hidden,false);
});

test('categorías vacías no inventan grabaciones y títulos externos siguen siendo texto',async()=>{
 const title='<img src=x onerror=alert(1)> Pregunta 77';
 const item={...base,id:'external',category:'catecismo-confesion',series:'<script>serie</script>',number:null,catechismQuestion:77,title};
 const app=await interfaceWith([item]);app.ids['open-taller-biblico'].click();
 assert.equal(app.ids['library-empty'].hidden,false);assert.equal(app.ids['group-navigation'].hidden,true);assert.equal(listed(app).length,0);
 app.ids['library-back'].click();app.ids['open-catecismo-confesion'].click();
 assert.equal(app.ids['library-heading'].textContent,item.series);assert.equal(listed(app)[0].children[0].textContent,title);
 listed(app)[0].click();assert.equal(app.ids['sermon-title'].textContent,title);
 assert.equal(library.label({...item,title:'Pregunta 770'}),'Pregunta 77 · Pregunta 770');
});

test('catecismo conserva lista descendente y recorrido ascendente por preguntas disponibles',async()=>{
 const data=[75,84,80].map(q=>({...base,id:`q-${q}`,category:'catecismo-confesion',series:'Catecismo',number:null,catechismQuestion:q,title:`Pregunta ${q}`}));
 const app=await interfaceWith(data);app.ids['open-catecismo-confesion'].click();
 assert.deepEqual(listed(app).map(button=>button.dataset.id),['q-84','q-80','q-75']);
 listed(app)[1].click();app.ids['next-message'].click();assert.equal(app.ids['sermon-title'].textContent,'Pregunta 84');assert.equal(app.ids['next-message'].disabled,true);
 app.ids['previous-message'].click();assert.equal(app.ids['sermon-title'].textContent,'Pregunta 80');
 app.ids['first-message'].click();app.player.metadata(600);assert.equal(app.ids['sermon-title'].textContent,'Pregunta 75');
 app.player.currentTime=85;app.ids['last-message'].click();assert.equal(app.ids['sermon-title'].textContent,'Pregunta 84');
 assert.equal(JSON.parse(app.storage.getItem(progress.KEY)).id,'q-75');assert.equal(app.player.paused,true);assert.equal(app.player.src,'');
});

test('volver, cambiar de categoría y regresar al reproductor conservan audio y progreso',async()=>{
 const data=[...records(2),...records(2,'taller-biblico')],app=await interfaceWith(data);
 app.ids['open-predicaciones'].click();listed(app)[0].click();app.ids['play-button'].click();app.player.metadata(600);app.player.currentTime=85;
 app.ids['player-back'].click();app.ids['library-back'].click();app.ids['open-taller-biblico'].click();
 assert.equal(app.player.paused,false);assert.equal(app.player.currentTime,85);assert.equal(app.player.playCalls,1);
 app.ids['return-player'].click();assert.equal(app.ids['sermon-title'].textContent,data[0].title);
 app.ids['player-back'].click();app.ids['open-saved'].click();assert.equal(app.ids['sermon-title'].textContent,data[0].title);
 app.ids['player-back'].click();listed(app)[1].click();
 assert.equal(app.player.paused,true);assert.equal(app.player.src,'');assert.equal(JSON.parse(app.storage.getItem(progress.KEY)).id,data[0].id);
});

test('continuidad desde inicio abre el mensaje guardado sin reproducir y la barra respeta los límites',async()=>{
 const storage=memoryStorage();progress.createStore(()=>storage).save(base,85,600);
 const app=await interfaceWith(catalog.sermons,{storage});view(app,'home');assert.equal(app.ids['open-saved'].hidden,false);
 app.ids['open-saved'].click();view(app,'player');assert.equal(app.player.playCalls,0);assert.equal(app.ids['resume-panel'].hidden,false);
 app.ids['resume-play'].click();app.player.metadata(600);assert.equal(app.player.currentTime,85);
 app.player.pause();app.ids['playback-position'].value='999';app.ids['playback-position'].emit('change');
 assert.equal(app.player.currentTime,600);assert.equal(app.player.paused,true);assert.equal(app.player.playCalls,1);
 assert.equal(app.ids['elapsed-time'].textContent,'10:00');
});

test('catálogo nuevo, fallos y foco no reemplazan el audio activo ni la vista elegida',async()=>{
 const data=records(12),options={},app=await interfaceWith(data,options);
 app.ids['open-predicaciones'].click();listed(app)[0].click();app.ids['play-button'].click();app.player.metadata(600);app.player.currentTime=90;
 app.ids['player-back'].click();listed(app)[1].focus();
 const loads=app.player.loadCalls,plays=app.player.playCalls;data.push(records(13)[12]);
 await app.reload();view(app,'library');assert.equal(app.document.activeElement.dataset.id,data[1].id);
 assert.equal(app.player.currentTime,90);assert.equal(app.player.paused,false);assert.equal(app.player.loadCalls,loads);assert.equal(app.player.playCalls,plays);
 options.catalogError=true;await app.reload();assert.match(app.ids['catalog-status'].textContent,/Puedes seguir escuchando/);
 app.hide();assert.equal(app.player.paused,false);
});

test('volver del teléfono recupera las vistas sin pausar ni cargar multimedia',async()=>{
 const app=await interfaceWith(records(2));app.ids['open-predicaciones'].click();listed(app)[0].click();view(app,'player');
 app.historyBack();view(app,'library');app.historyBack();view(app,'home');
 assert.equal(app.player.loadCalls,0);assert.equal(app.player.playCalls,0);
});

test('salto al contenido conserva la vista sin mostrar un bloque fijo de catálogo',async()=>{
 const app=await interfaceWith(records(2));app.ids['open-predicaciones'].click();listed(app)[0].click();
 assert.equal(app.ids['catalog-notice'].hidden,true);
 app.ids['skip-link'].click();assert.equal(app.document.activeElement,app.ids['contenido']);view(app,'player');
 app.ids['player-back'].click();assert.equal(app.ids['catalog-notice'].hidden,true);
});

test('un error de audio desactiva también la barra de posición sin iniciar otro audio',async()=>{
 const app=await interfaceWith(records(1));app.ids['open-predicaciones'].click();listed(app)[0].click();
 app.ids['play-button'].click();app.player.metadata(600);assert.equal(app.ids['playback-position'].disabled,false);
 app.player.emit('error');assert.equal(app.ids['playback-position'].disabled,true);assert.equal(app.player.playCalls,1);
});

test('abrir una categoría antes de terminar la carga conserva categoría y primera página',async()=>{
 for(const category of ['predicaciones','taller-biblico']) {
  let release;const catalogGate=new Promise(resolve=>{release=resolve;});
  const app=await interfaceWith([...records(12),...records(5,'taller-biblico')],{catalogGate});
  app.ids['open-'+category].click();assert.equal(app.ids['library-empty'].hidden,true);
  release();await new Promise(setImmediate);view(app,'library');
  assert.equal(listed(app)[0].dataset.id,`fixture-${category}-1`);
  assert.equal(app.ids['message-range'].textContent,'Página 1');assert.equal(app.player.playCalls,0);
 }
});
