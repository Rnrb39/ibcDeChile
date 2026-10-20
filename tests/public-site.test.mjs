import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const script = readFileSync(new URL('script.js', root), 'utf8');
const html = readFileSync(new URL('sermones.html', root), 'utf8');
const api = vm.runInNewContext(script + '\n({ mensajesColosenses, sermones, playlists, htmlColosenses, htmlPlaylists, htmlSermones, fechaEnEspanol, escapar, cargarColosenses });', {
    document: { addEventListener() {} },
    // El formato de fechas debe funcionar sin instanciar fechas ni convertir zonas.
    Date: class { constructor() { throw new Error('No convertir días de calendario a Date'); } }
});

// Base publicada al iniciar esta corrección. Fija la comparación aunque avance main.
const publishedScript = execFileSync('git', ['show', 'cd4aa5b:script.js'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const published = vm.runInNewContext(publishedScript + '\n({ mensajesColosenses, sermones, playlists, cargarVideo });', {
    document: { addEventListener() {} }
});

test('la candidata conserva íntegros los datos publicados y la lógica de menú y visor', () => {
    assert.equal(JSON.stringify(api.mensajesColosenses.slice(0, published.mensajesColosenses.length)), JSON.stringify(published.mensajesColosenses));
    for (const key of ['sermones', 'playlists']) {
        assert.equal(JSON.stringify(api[key]), JSON.stringify(published[key]));
    }
    const current = script.replace(/\r\n/g, '\n');
    const part = (s, start, end) => s.slice(s.indexOf(start), s.indexOf(end, s.indexOf(start)));
    assert.equal(part(current, "    const botonMenu =", "    const titulos ="), part(publishedScript, "    const botonMenu =", "    const titulos ="));
    assert.equal(part(current, 'async function cargarGaleria()', '    try {'), part(publishedScript, 'async function cargarGaleria()', '    try {'));
});

test('Facebook conserva exactamente la implementación publicada, incluido el fallback', () => {
    const current = vm.runInNewContext(script + '\ncargarVideo;', { document: { addEventListener() {} } });
    assert.equal(current.toString().replace(/\r\n/g, '\n'), published.cargarVideo.toString());
});

test('el HTML inicial coincide con las tarjetas de la fuente de datos', () => {
    execFileSync(process.execPath, ['scripts/generar-sermones.mjs', '--check'], { cwd: root });
    for (const id of ['mensajeColosenses', 'videoColosenses', 'enlaceColosenses']) {
        assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
    }
    assert.equal((html.match(/<video\b/g) || []).length, 1);
    assert.ok(html.includes('www.youtube-nocookie.com/embed/videoseries'));
    assert.equal((api.htmlSermones().match(/class="titulo-sermon-tarjeta"/g) || []).length, 2);
});

test('se conservan los 11 mensajes y se incorpora el 12 con sus metadatos y video', () => {
    assert.equal(api.mensajesColosenses.length, 12);
    api.mensajesColosenses.forEach((m, i) => {
        assert.equal(m.numeroMensaje, i + 1);
        assert.equal(m.videoUrl, `https://videos.ibcdechile.org/colosenses-${String(i + 1).padStart(2, '0')}.mp4`);
        assert.equal(m.predicador, 'Pastor Sergio Arias Cáceres');
        assert.equal(!!m.fechaEstimada, i < 5);
    });
    assert.equal(api.fechaEnEspanol('2026-08-02'), '2 de agosto de 2026');
    assert.equal(api.fechaEnEspanol('2026-10-11'), '11 de octubre de 2026');
    assert.equal(api.fechaEnEspanol('2026-10-18'), '18 de octubre de 2026');
    assert.equal(api.mensajesColosenses[11].titulo, 'El ayer y el hoy');
    assert.equal(api.mensajesColosenses[11].pasaje, 'Colosenses 2:11–15');
});

test('el renderizado conserva controles, carga diferida y escape de texto', () => {
    const output = api.htmlColosenses();
    assert.match(output, /controls playsinline preload="none"/);
    assert.doesNotMatch(output, /autoplay|undefined/);
    assert.equal(api.escapar('<script>"&'), '&lt;script&gt;&quot;&amp;');
});

test('mejorar HTML existente no reinserta tarjetas ni inicia descargas', () => {
    const events = [];
    const nodes = {
        contenedorColosenses: { set innerHTML(_) { assert.fail('No reemplazar HTML inicial'); } },
        mensajeColosenses: { value: '1', addEventListener(event, fn) { this.change = fn; } },
        videoColosenses: {
            pause() { events.push('pause'); }, load() { events.push('load'); },
            setAttribute() {}, querySelector() { return { set src(url) { events.push(url); } }; }
        },
        detalleColosenses: {}, enlaceColosenses: {}
    };
    const context = vm.createContext({ document: { addEventListener() {}, getElementById(id) { return nodes[id]; } } });
    vm.runInContext(script + '\ncargarColosenses();', context);
    assert.deepEqual(events, []);
    nodes.mensajeColosenses.value = '12';
    nodes.mensajeColosenses.change();
    assert.deepEqual(events, ['pause', 'https://videos.ibcdechile.org/colosenses-12.mp4', 'load']);
    assert.match(nodes.detalleColosenses.innerHTML, /El ayer y el hoy/);
    assert.equal(nodes.enlaceColosenses.href, 'https://videos.ibcdechile.org/colosenses-12.mp4');
});

test('galería reserva doce celdas antes de JavaScript y versiones actuales', () => {
    const gallery = readFileSync(new URL('galeria.html', root), 'utf8');
    assert.equal((gallery.match(/class="galeria-reserva"/g) || []).length, 12);
    assert.match(gallery, /main\.css\?v=cls-20261017/);
    assert.match(html, /main\.css\?v=preguntas-20261020/);
    assert.match(html, /script\.js\?v=biblioteca-20261019/);
    assert.match(gallery, /script\.js\?v=cls-20261017/);
});

async function galeriaDePrueba(fotos) {
    class Elemento {
        constructor() { this.children = []; this.eventos = {}; this.attributes = {}; this.hidden = true; }
        addEventListener(nombre, fn) { this.eventos[nombre] = fn; }
        setAttribute(nombre, valor) { this.attributes[nombre] = valor; }
        appendChild(elemento) { this.children.push(elemento); }
        replaceChildren(...elementos) { this.children = elementos; }
        focus() {}
        click() { if (!this.disabled) this.eventos.click?.(); }
    }
    const ids = ['galeria-grid', 'lightbox', 'lightbox-img', 'lightbox-cerrar', 'galeria-anterior', 'galeria-siguiente', 'galeria-estado'];
    const nodes = Object.fromEntries(ids.map(id => [id, new Elemento()]));
    const document = {
        body: { children: [] }, addEventListener() {},
        getElementById(id) { return nodes[id]; }, createElement() { return new Elemento(); }
    };
    const cargar = vm.runInNewContext(script + '\ncargarGaleria;', {
        document, fetch: async () => ({ ok: true, json: async () => ({ fotos }) })
    });
    await cargar();
    return nodes;
}

test('paginación recorre las 30 fotos actuales en ambos sentidos sin omisiones ni duplicados', async () => {
    const fotos = JSON.parse(readFileSync(new URL('data/fotos.json', root), 'utf8')).fotos;
    const nodes = await galeriaDePrueba(fotos);
    const grid = nodes['galeria-grid'];
    const visibles = () => grid.children.filter(n => n.className === 'galeria-foto').map(n => n.children[0].src);
    const forward = [];
    let paginas = 0;
    do {
        assert.equal(grid.children.length, 12);
        forward.push(...visibles());
        paginas++;
        if (nodes['galeria-siguiente'].disabled) break;
        nodes['galeria-siguiente'].click();
    } while (paginas < 100);
    assert.deepEqual(forward, fotos.map(f => f.thumb || f.src));
    assert.equal(paginas, Math.ceil(fotos.length / 12));
    for (let pagina = paginas - 2; pagina >= 0; pagina--) {
        nodes['galeria-anterior'].click();
        assert.deepEqual(visibles(), fotos.slice(pagina * 12, (pagina + 1) * 12).map(f => f.thumb || f.src));
    }
    assert.equal(nodes['galeria-anterior'].disabled, true);
});

test('paginación no impone un límite de 30 y conserva la última fotografía en límites de página', async () => {
    for (const cantidad of [1, 12, 13, 24, 25, 30, 31, 60, 61]) {
        const fotos = Array.from({ length: cantidad }, (_, n) => ({ src: `foto-${n + 1}.jpg` }));
        const nodes = await galeriaDePrueba(fotos);
        const visitadas = [];
        for (let pagina = 0; pagina < Math.ceil(cantidad / 12); pagina++) {
            visitadas.push(...nodes['galeria-grid'].children.filter(n => n.className === 'galeria-foto').map(n => n.children[0].src));
            assert.equal(nodes['galeria-grid'].children.length, 12);
            nodes['galeria-siguiente'].click();
        }
        assert.deepEqual(visitadas, fotos.map(f => f.src));
        assert.equal(nodes['galeria-siguiente'].disabled, true);
    }
});
