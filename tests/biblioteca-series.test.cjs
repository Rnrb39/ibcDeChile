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

test('doce Colosenses reutilizan sus MP3 publicados: selector pausado, refresco y catálogo prioritario', () => {
    const nodes={contenedorColosenses:{},mensajeColosenses:{value:'1',addEventListener(){}}};
    const legacy=JSON.parse(JSON.stringify(vm.runInNewContext(source+'\ncargarColosenses(); IBCLegacyColosenses.items;',{
        document:{addEventListener(){},getElementById(id){return nodes[id];}}
    })));
    const manifest=JSON.parse(readFileSync(require.resolve('../app/catalog.json'),'utf8')).sermons;
    const known=manifest.find(i=>i.id==='colosenses-12');
    const last=legacy.find(i=>i.number===12);
    assert.equal(last.audioUrl,known.audioUrl);assert.equal(last.audioVersion,known.audioVersion);
    for(const item of legacy){
        const expected=manifest.find(d=>d.series===item.series&&d.number===item.number);
        assert.equal(item.title,expected.title);assert.equal(item.passage,expected.passage);assert.equal(item.speaker,expected.speaker);
        assert.equal(item.audioUrl,expected.audioUrl);assert.equal(item.audioVersion,expected.audioVersion);
    }
    assert.ok(legacy.every(i=>!i.id&&!i.publicId));
    const group=lib.organize(legacy,[]).groups[0];assert.equal(group.items.length,12);
    const document=new Element('document');document.createElement=tag=>new Element(tag);document.createDocumentFragment=()=>new Element('fragment');
    const ui=vm.runInNewContext(readFileSync(require.resolve('../biblioteca-series.js'),'utf8')+'\nIBCBiblioteca;',{document});
    const card=new Element('article');document.append(card);const controller=ui.seriesCard(card,group);
    const select=card.querySelector('select'),audio=card.querySelector('audio');
    assert.equal(audio.parent.hidden,false);assert.equal(audio.src,legacy[0].audioUrl);assert.equal(audio.paused,true);
    for(const number of [6,1,11]){audio.paused=false;const item=legacy.find(i=>i.number===number);select.value=item.videoUrl;select.events.change();assert.equal(audio.src,item.audioUrl);assert.equal(audio.dataset.revision,item.audioVersion);assert.equal(audio.parent.hidden,false);assert.equal(audio.paused,true);}
    select.value=last.videoUrl;select.events.change();
    assert.equal(audio.parent.hidden,false);assert.equal(audio.src,known.audioUrl);assert.equal(audio.dataset.revision,known.audioVersion);
    assert.equal(audio.preload,'none');assert.equal(audio.autoplay,undefined);assert.equal(audio.paused,true);
    audio.paused=false;const loads=audio.loads;controller.update(lib.organize(legacy,[]).groups[0]);
    assert.equal(audio.loads,loads);assert.equal(audio.paused,false);
    select.value=legacy[10].videoUrl;select.events.change();assert.equal(audio.src,legacy[10].audioUrl);assert.equal(audio.parent.hidden,false);assert.equal(audio.paused,true);
    select.value=last.videoUrl;select.events.change();assert.equal(audio.src,known.audioUrl);assert.equal(audio.paused,true);
    const approved=record({...last,id:'admin-200',publicId:'200',videoUrl:'https://videos.ibcdechile.org/prueba-local-migrada.mp4',audioUrl:'https://videos.ibcdechile.org/audio/prueba-local-migrada.mp3',audioVersion:'aprobada'});
    const migrated=lib.organize(legacy,[approved]).groups[0];assert.equal(migrated.items.length,12);assert.equal(migrated.items[11].id,approved.id);
    controller.update(migrated);select.value=approved.id;select.events.change();assert.equal(audio.src,approved.audioUrl);
    controller.update(lib.organize(legacy,[{...approved,audioUrl:null,audioVersion:null}]).groups[0]);
    assert.equal(audio.parent.hidden,true);assert.equal(audio.src,null); // No resucitar audio retirado de un DTO aprobado.
});

test('la tarjeta HTML inicializa audio en mensaje 1 o selección restaurada sin recargar el MP4', () => {
    const data=vm.runInNewContext(source+'\nmensajesColosenses;',{document:{addEventListener(){}}});
    for(const initial of [1,12]){
        const document=new Element('document');document.createElement=tag=>new Element(tag);document.createDocumentFragment=()=>new Element('fragment');
        const ui=vm.runInNewContext(readFileSync(require.resolve('../biblioteca-series.js'),'utf8')+'\nIBCBiblioteca;',{document});
        const items=data.map(m=>({series:m.serie,category:'predicaciones',number:m.numeroMensaje,title:m.titulo,videoUrl:m.videoUrl,audioUrl:m.audioUrl,audioVersion:m.audioVersion}));
        const item=items[initial-1],card=new Element('article'),video=new Element('video'),mediaSource=new Element('source');mediaSource.src=item.videoUrl;video.append(mediaSource);
        const count=new Element('p'),heading=new Element('h3'),selector=new Element('select'),detail=new Element('div'),link=new Element('a');selector.value=String(initial);
        card.append(count,heading,selector,detail,video,link);document.append(card);const find=card.querySelector.bind(card);
        card.querySelector=s=>({'.sermon-serie':count,'h3':heading,'select':selector,'.detalle-mensaje':detail,'video':video,'#enlaceColosenses':link}[s]||find(s));
        const group={title:'Colosenses',category:'predicaciones',items};const controller=ui.seriesCard(card,group,true),audio=card.querySelector('audio');
        assert.equal(audio.src,item.audioUrl);assert.equal(audio.parent.hidden,false);assert.equal(audio.paused,true);assert.equal(selector.value,item.videoUrl);
        assert.equal(video.loads,0);assert.equal(video.querySelector('source').src,item.videoUrl);
        const loads=audio.loads;audio.paused=false;controller.update(group);assert.equal(audio.loads,loads);assert.equal(audio.paused,false);
    }
});

test('colección sin sesiones: preguntas 84, 80 y 75; desconocidas y empates por ID, sin usar fechas', () => {
    const study = (id,date,extra={})=>record({id:'admin-'+id,publicId:id,category:'catecismo-confesion',series:'Estudio del Catecismo y la Confesión Bautista',number:null,date,videoUrl:'video-'+id,...extra});
    const a=study('10','2026-12-31',{title:'Pregunta 999 · capítulo 26'}),b=study('2',null),c=study('3','2026-10-04',{catechismQuestion:75}),d=study('4','2026-01-01',{catechismQuestion:84});
    const e=study('5','2026-11-01',{catechismQuestion:80}),f=study('6','2026-12-31',{catechismQuestion:84});
    const result=lib.organize([], [a,e,d,b,f,c]);
    assert.deepEqual(result.groups[0].items.map(i=>i.publicId),['4','6','5','3','2','10']);
    assert.deepEqual(result.pending,[]);
    assert.equal(lib.classified({...a,category:'taller-biblico'}),false);
    assert.equal(lib.classified({...a,category:'predicaciones'}),false);
    for(const number of [0,-1,1.5,undefined])assert.equal(lib.classified({...a,number}),false);
    assert.equal(lib.optionLabel({...a,title:'Pregunta doctrinal confirmada'}),'Pregunta doctrinal confirmada');
    assert.equal(lib.numberLabel(a),'');
    assert.equal(lib.numberLabel(d),'');
    assert.equal(lib.optionLabel(d),'Pregunta 84 · '+d.title);
    assert.equal(lib.questionLabel(a),'');
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
