// Instantánea y respaldo temporal del sitio estático: mantiene visibles las tarjetas
// antes de descargar JavaScript. No es la futura vía de actualización del catálogo;
// ese consumidor deberá actualizar el DOM en ejecución sin depender de este generador.
// Tras editar los datos de script.js: node scripts/generar-sermones.mjs
// En pruebas: node scripts/generar-sermones.mjs --check
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'script.js'), 'utf8');
const renderers = vm.runInNewContext(source + '\n({ htmlColosenses, htmlPlaylists, htmlSermones });', {
    document: { addEventListener() {} }
});
const file = resolve(root, 'sermones.html');
let html = await readFile(file, 'utf8');
for (const [name, render] of Object.entries(renderers)) {
    const key = name.slice(4).toUpperCase();
    const pattern = new RegExp(`<!-- INICIO ${key} -->[\\s\\S]*?<!-- FIN ${key} -->`);
    if (!pattern.test(html)) throw new Error(`Faltan marcadores ${key} en sermones.html`);
    const content = render().replace(/^[\t ]+$/gm, '');
    html = html.replace(pattern, `<!-- INICIO ${key} -->${content}<!-- FIN ${key} -->`);
}
if (process.argv.includes('--check')) {
    if (html !== await readFile(file, 'utf8')) throw new Error('Tarjetas desactualizadas: ejecute node scripts/generar-sermones.mjs');
    console.log('Tarjetas de sermones sincronizadas con script.js');
} else {
    await writeFile(file, html);
    console.log('Tarjetas de sermones generadas');
}
