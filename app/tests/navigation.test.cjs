const test=require('node:test');
const assert=require('node:assert/strict');
const {interfaceWith}=require('./helpers/interface.cjs');
const library=require('../library.js');
const catalog=require('../catalog.json');
const progress=require('../playback-progress.js');
const base=catalog.sermons[0];
const records=count=>Array.from({length:count},(_,i)=>({...base,id:`fixture-${i+1}`,number:i+1,title:`Mensaje de prueba ${i+1}`,series:'Serie de prueba',date:'2026-10-20',dateEstimated:false}));
const choose=(app,id)=>app.ids['sermon-list'].children.find(li=>li.children[0].dataset.id===id).children[0].click();

for(const count of [1,12,35])test(`${count} audios: último, primer mensaje, grupos y selección intermedia sin precarga`,async()=>{
 const data=records(count),app=await interfaceWith(data);
 assert.equal(app.ids['sermon-title'].textContent,data[count-1].title);
 assert.equal(app.ids['series-list'].children.length,1);
 assert.equal(app.player.src,'');assert.equal(app.player.playCalls,0);
 app.ids['play-button'].click();app.player.metadata(600);
 assert.equal(app.player.src,base.audioUrl);assert.equal(app.player.paused,false);
 app.player.currentTime=75;
 app.ids['series-list'].children[0].click();
 assert.equal(app.player.paused,true);assert.equal(app.player.src,'');
 assert.equal(JSON.parse(app.storage.getItem(progress.KEY)).id,data[count-1].id);
 assert.equal(app.ids['message-picker'].open,true);
 assert.equal(app.ids['sermon-title'].textContent,data[0].title);
 assert.ok(app.ids['sermon-list'].children.length<=10);
 app.ids['first-message'].click();app.player.metadata(600);
 assert.equal(app.ids['sermon-title'].textContent,data[0].title);assert.equal(app.player.paused,false);
 app.player.currentTime=80;app.player.pause();
 app.ids['resume-play'].click();app.player.metadata(600);assert.equal(app.player.currentTime,80);
 app.player.pause();
 if(count>10){app.ids['next-group'].click();assert.match(app.ids['message-range'].textContent,/11–/);choose(app,data[10].id);assert.equal(app.ids['sermon-title'].textContent,data[10].title);assert.equal(app.player.src,'');}
 app.ids['last-message'].click();assert.equal(app.ids['sermon-title'].textContent,data[count-1].title);assert.equal(app.player.src,'');
 app.ids['first-group'].click();assert.equal(app.ids['sermon-list'].children[0].children[0].dataset.id,data[0].id);
 app.ids['last-group'].click();assert.ok(app.ids['sermon-list'].children.some(li=>li.children[0].dataset.id===data[count-1].id));
 assert.equal(app.ids['next-message'].disabled,true);
 if(count>1){app.ids['previous-message'].click();assert.equal(app.ids['sermon-title'].textContent,data[count-2].title);app.ids['next-message'].click();assert.equal(app.ids['sermon-title'].textContent,data[count-1].title);}
});

test('catalog refresh and visibility preserve the active audio and selection; failures retain valid records',async()=>{
 const data=records(12),options={};const app=await interfaceWith(data,options);
 app.ids['play-button'].click();app.player.metadata(600);app.player.currentTime=90;
 const loads=app.player.loadCalls,plays=app.player.playCalls;
 data.push(records(13)[12]);
 app.hide();assert.equal(app.player.paused,false);
 app.advanceClock(30000);app.show();await new Promise(setImmediate);
 assert.equal(app.ids['sermon-title'].textContent,'Mensaje de prueba 12');
 assert.equal(app.player.currentTime,90);assert.equal(app.player.paused,false);
 assert.equal(app.player.loadCalls,loads);assert.equal(app.player.playCalls,plays);
 assert.equal(app.ids['latest-note'].hidden,true);
 options.catalogError=true;await app.reload();
 assert.match(app.ids['catalog-status'].textContent,/Conservamos/);
 assert.equal(app.ids['series-list'].children.length,1);
 assert.equal(app.player.currentTime,90);assert.equal(app.player.paused,false);
 delete options.catalogError;data.splice(0,data.length);await app.reload();
 assert.match(app.ids['catalog-status'].textContent,/Conservamos/);
 app.ids['last-message'].click();assert.equal(app.ids['sermon-title'].textContent,'Mensaje de prueba 13');
});

test('published public catalog errors never replace the valid collection with the historical fallback',async()=>{
 const dto={id:'900',titulo:'Grabación pública',categoria:'catecismo_confesion',serie:{titulo:'Catecismo'},numero_mensaje:null,pregunta_catecismo:84,fecha:null,predicador:{nombre:'Prueba'},video:{url:'https://videos.ibcdechile.org/test.mp4',mime_type:'video/mp4',version:'v1'},audio:{url:base.audioUrl,mime_type:'audio/mpeg',version:'a1'}};
 const options={publicCatalog:{value:{version_esquema:1,revision_catalogo:'1',actualizado_en:'2026-10-20T12:00:00Z',contenidos:[dto]}}};
 const app=await interfaceWith(records(1),options);
 const category=app.ids['catecismo-confesion-recordings'];
 category.children.find(node=>node.tag==='button').click();app.player.metadata(600);app.player.currentTime=85;
 options.publicError=true;await app.reload();
 assert.equal(app.ids['sermon-title'].textContent,dto.titulo);assert.equal(app.player.currentTime,85);assert.equal(app.player.paused,false);
 assert.match(app.ids['catalog-status'].textContent,/Conservamos/);
});

test('Catechism question order is descending, independent of upload dates; series keep editorial numbers',async()=>{
 const data=[75,84,80].map((q,i)=>({...base,id:`q-${q}`,category:'catecismo-confesion',series:'Catecismo',number:null,catechismQuestion:q,title:`Pregunta ${q}`,date:`2026-10-${20-i}`}));
 const app=await interfaceWith(data);
 assert.match(app.ids['sermon-title'].textContent,/84/);
 assert.deepEqual(library.sequence(data).map(item=>item.catechismQuestion),[84,80,75]);
 assert.deepEqual(app.ids['sermon-list'].children.map(li=>li.children[0].dataset.id),['q-84','q-80','q-75']);
 assert.deepEqual(library.sequence(records(12).reverse()).map(item=>item.number),Array.from({length:12},(_,i)=>i+1));
});

test('external titles stay plain text and video-only records never load multimedia',async()=>{
 const malicious={...base,id:'external',series:'<img src=x onerror=alert(1)>',title:'<script>alert(1)</script>'};
 const app=await interfaceWith([malicious]);
 assert.equal(app.ids['sermon-title'].textContent,malicious.title);
 assert.equal(app.ids['series-list'].children[0].textContent,malicious.series+' · 1 grabaciones');
 assert.equal(app.player.src,'');
 const onlyVideo=await interfaceWith([{...base,audioUrl:null,audioVersion:null,videoUrl:'https://videos.ibcdechile.org/test.mp4'}]);
 assert.equal(onlyVideo.ids['retry-catalog'].hidden,false);assert.equal(onlyVideo.mediaAssignments.length,0);
});

test('catalog refresh retains keyboard focus in the message picker',async()=>{
 const app=await interfaceWith(records(35));
 app.ids['series-list'].children[0].click();
 app.ids['sermon-list'].children[3].children[0].focus();
 await app.reload();
 assert.equal(app.document.activeElement.dataset.id,'fixture-4');
 assert.equal(app.ids['sermon-title'].textContent,'Mensaje de prueba 1');
});
