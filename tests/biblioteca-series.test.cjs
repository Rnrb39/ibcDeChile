const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const lib = require('../biblioteca-series.js');
const source = readFileSync(require.resolve('../script.js'), 'utf8');
const history = JSON.parse(JSON.stringify(vm.runInNewContext(source + '\nmensajesColosenses.map(m=>({category:"predicaciones",series:m.serie,number:m.numeroMensaje,title:m.titulo,passage:m.pasaje,speaker:m.predicador,date:m.fecha,dateEstimated:!!m.fechaEstimada,videoUrl:m.videoUrl}));', { document: { addEventListener() {} } })));
const record = (overrides = {}) => ({ id: 'admin-100', publicId: '100', title: 'PRUEBA LOCAL', category: 'predicaciones', series: 'Colosenses', number: 13, videoUrl: 'https://videos.ibcdechile.org/prueba-local.mp4', ...overrides });

test('conserva doce históricos sin inventar IDs y agrega números reales', () => {
    const { groups } = lib.organize(history, [record(), record({ id: 'admin-101', number: 15, videoUrl: 'https://videos.ibcdechile.org/prueba-local-15.mp4' })]);
    assert.deepEqual(groups[0].items.map(i => i.number), [...Array.from({length: 13}, (_, i) => i + 1), 15]);
    assert.equal(lib.organize(history, []).groups[0].items.length, 12);
    assert.ok(history.every(i => !i.id));
});
test('deduplica migraciones exactas sin confundir títulos o números parecidos', () => {
    const migrated = record({ ...history[0], id: 'admin-1', videoUrl: 'https://videos.ibcdechile.org/nueva-version.mp4' });
    const group = lib.organize(history, [migrated, migrated]).groups[0];
    assert.equal(group.items.length, 12); assert.equal(group.items[0].id, 'admin-1');
    assert.equal(lib.sameRecording(history[0], { ...migrated, passage: null }), false);
    assert.equal(lib.sameRecording(history[0], { ...migrated, title: 'Otro título' }), false);
});
test('clasifica series futuras y distingue las tres categorías; sin metadatos queda pendiente', () => {
    const pending = record({ publicId: '1', category: 'taller-biblico', series: null, number: null });
    const live = [pending, record({ id: 'admin-2', series: 'Parábolas', category: 'taller-biblico', number: 3, videoUrl: 'b' }), record({ id: 'admin-3', series: 'Parábolas', category: 'catecismo-confesion', number: 2, videoUrl: 'c' })];
    const result = lib.organize([], live);
    assert.equal(result.groups.length, 2);
    assert.deepEqual(result.pending[0].missing, ['serie', 'numero_mensaje']);
    assert.equal(lib.recent(live).length, 3);
    for (const number of [0, -1, '1', 1.5]) assert.equal(lib.classified(record({ number })), false);
});
test('recientes conserva todos, deduplica y ordena fechas confirmadas sin inventar las desconocidas', () => {
    const a = record({ date: null }), b = record({ id: 'b', videoUrl: 'b', date: '2026-10-19' }), c = record({ id: 'c', videoUrl: 'c', date: null });
    assert.deepEqual(lib.recent([a,b,c,a]).map(i=>i.id), ['b','admin-100','c']);
    assert.equal(lib.dateLabel({date:'2026-08-02',dateEstimated:true}), '2 de agosto de 2026 · Fecha estimada');
    for (const date of [null, '2026-02-30', 'undefined']) assert.equal(lib.dateLabel({date}), 'Fecha desconocida');
});

// DOM mínimo para comprobar las transiciones de medios, sin dependencias externas.
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.events = {}; this.paused = true; this.loads = 0; this.pauses = 0; }
    append(...nodes) { for (const n of nodes) { if (n.tag === 'fragment') this.append(...n.children); else {this.children.push(n); n.parent = this;} } }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    setAttribute(k,v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] ?? null; }
    removeAttribute(k) { delete this.attributes[k]; }
    set src(v) { this.setAttribute('src',v); } get src() { return this.getAttribute('src'); }
    addEventListener(k,f) { this.events[k] = f; }
    querySelectorAll(selector) { const tags = selector.split(',').map(s=>s.trim()); return this.children.flatMap(n=>[...(tags.includes(n.tag) ? [n] : []), ...n.querySelectorAll(selector)]); }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    pause() { this.paused = true; this.pauses++; }
    load() { this.loads++; this.readyState = 0; this.currentTime = 0; this.duration = NaN; }
    remove() { this.parent.children = this.parent.children.filter(n=>n!==this); }
}
test('selector pausa, cambia video y MP3 sin autoplay, y no recarga al refrescar sin cambios', () => {
    const document = new Element('document'); document.createElement = tag=>new Element(tag); document.createDocumentFragment = ()=>new Element('fragment');
    const ui = vm.runInNewContext(readFileSync(require.resolve('../biblioteca-series.js'),'utf8') + '\nIBCBiblioteca;', { document });
    const card = new Element('article'); document.append(card);
    const one = record({number:1,audioUrl:'audio-1',videoVersion:'v1',audioVersion:'a1'}), two = record({id:'admin-2',number:2,videoUrl:'video-2',audioUrl:null});
    const group = {title:'Colosenses',category:'predicaciones',items:[one,two]};
    const controller = ui.seriesCard(card, group);
    const video=card.querySelector('video'), audio=card.querySelector('audio'), select=card.querySelector('select');
    assert.equal(video.preload,'none'); assert.equal(video.controls,true); assert.equal(video.playsInline,true); assert.equal(video.autoplay,undefined);
    const loads=video.loads; video.paused=false; controller.update(group);
    assert.equal(video.loads,loads); assert.equal(video.paused,false);
    select.value='admin-2'; select.events.change();
    assert.equal(video.src,'video-2'); assert.equal(video.paused,true); assert.equal(audio.src,null);
    assert.equal(audio.parent.hidden,true);
    controller.update({...group,items:[one]});
    assert.equal(video.src,one.videoUrl); assert.equal(audio.src,'audio-1');
    controller.update({...group,items:[{...one,videoVersion:'v2'}]});
    assert.equal(video.dataset.revision,'v2'); assert.ok(video.loads>loads);
    controller.remove(); assert.equal(document.children.length,0);
});

test('colección sin números: fechas confirmadas primero y fechas desconocidas por ID estable', () => {
    const study = (id,date,extra={})=>record({id:'admin-'+id,publicId:id,category:'catecismo-confesion',series:'Estudio del Catecismo y la Confesión Bautista',number:null,date,videoUrl:'video-'+id,...extra});
    const a=study('10',null),b=study('2',null),c=study('3','2026-10-04'),d=study('4','2026-10-11');
    const result=lib.organize([], [a,d,b,c]);
    assert.deepEqual(result.groups[0].items.map(i=>i.publicId),['4','3','2','10']);
    assert.deepEqual(result.pending,[]);
    assert.equal(lib.classified({...a,category:'taller-biblico'}),false);
    assert.equal(lib.classified({...a,category:'predicaciones'}),false);
    for(const number of [0,-1,1.5,undefined])assert.equal(lib.classified({...a,number}),false);
    assert.equal(lib.optionLabel({...a,title:'Pregunta doctrinal confirmada'}),'Pregunta doctrinal confirmada');
    assert.equal(lib.numberLabel(a),'');
    assert.equal(lib.sameRecording(a,{...a,videoUrl:'otra-grabacion'}),false);
});

test('referencias y partes explícitas se conservan como texto; salto sin autoplay y cancelable', () => {
    assert.deepEqual(lib.chapters('Pregunta 84\n06:44 — Referencia de prueba\n06:44 — Duplicada\n1:06:44 - Otra parte\n00:99 — Inválida\nPárrafo 15'),[
        {seconds:404,label:'06:44 — Referencia de prueba'},{seconds:4004,label:'1:06:44 - Otra parte'}
    ]);
    const document = new Element('document'); document.createElement=tag=>new Element(tag);document.createDocumentFragment=()=>new Element('fragment');
    const ui=vm.runInNewContext(readFileSync(require.resolve('../biblioteca-series.js'),'utf8')+'\nIBCBiblioteca;',{document});
    const card=new Element('article');document.append(card);
    const item=record({category:'catecismo-confesion',number:null,title:'Referencia de prueba',description:'Texto <script>sin HTML</script>\n06:44 — Referencia de prueba'});
    const other={...item,id:'admin-101',videoUrl:'otro-video'};
    ui.seriesCard(card,{title:'Colección de prueba',category:item.category,items:[item,other]});
    assert.equal(card.querySelector('option').textContent,item.title);
    assert.equal(card.querySelector('details').children[1].textContent,item.description);
    assert.ok(!card.querySelectorAll('p').some(p=>/Clase null|Mensaje null/.test(p.textContent)));
    const video=card.querySelector('video'),button=card.querySelector('button');button.events.click();
    assert.equal(video.paused,true);assert.equal(video.preload,'metadata');
    video.readyState=1;video.duration=1000;video.events.loadedmetadata();assert.equal(video.currentTime,404);
    video.readyState=0;button.events.click();const select=card.querySelector('select');select.value=other.id;select.events.change();
    video.readyState=1;video.duration=1000;video.events.loadedmetadata();assert.equal(video.currentTime,0);assert.equal(video.preload,'none');
});
