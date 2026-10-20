const test=require('node:test'),assert=require('node:assert/strict');
const {interfaceWith}=require('./helpers/interface.cjs');
const consumer=require('../../catalogo-publico.js');
test('catálogo v1 catecismo sin número conserva descripción, selección, audio y continuidad en PWA',async()=>{
 const dto={id:'900',titulo:'Referencia confirmada de prueba local',categoria:'catecismo_confesion',serie:{id:'90',titulo:'Estudio del Catecismo y la Confesión Bautista'},numero_mensaje:null,fecha:null,predicador:{nombre:'Expositor de prueba local'},descripcion:'Referencia doctrinal de prueba; sin inferir sesiones.',video:{url:'https://videos.ibcdechile.org/prueba-local.mp4',mime_type:'video/mp4',version:'test-video'},audio:{url:'https://videos.ibcdechile.org/audio/prueba-local.mp3',mime_type:'audio/mpeg',version:'test-audio',bytes:1000}};
 const value={version_esquema:1,revision_catalogo:'900',actualizado_en:'2026-10-20T12:00:00Z',contenidos:[dto]},item=consumer.adapt(value).sermons[0];
 assert.equal(item.number,null);assert.equal(item.description,dto.descripcion);assert.equal(item.catechismQuestion,null);
 for(const question of [75,80,84]){const mapped=consumer.adapt({...value,contenidos:[{...dto,pregunta_catecismo:question}]}).sermons[0];assert.equal(mapped.catechismQuestion,question);assert.equal(mapped.number,null);}
 for(const question of [0,-1,1.5,'84',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>consumer.adapt({...value,contenidos:[{...dto,pregunta_catecismo:question}]}),/CATALOG_INVALID/);
 const ui=await interfaceWith([],{publicCatalog:{value}});ui.select(item);assert.equal(ui.ids['sermon-title'].textContent,dto.titulo);assert.equal(ui.ids['sermon-series'].textContent,dto.serie.titulo);
 ui.ids['play-button'].click();ui.player.metadata(600);assert.equal(ui.player.src,dto.audio.url);assert.equal(ui.player.paused,false);
 ui.player.currentTime=75;ui.player.pause();assert.equal(ui.ids['resume-panel'].hidden,false);
 ui.ids['resume-play'].click();ui.player.metadata(600);assert.equal(ui.player.currentTime,75);assert.equal(ui.player.paused,false);
 ui.ids['play-button'].click();assert.equal(ui.player.paused,true);
});
