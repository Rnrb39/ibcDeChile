// Servidor de revisión local. No se incluye en la web publicada.
// node scripts/cls-preview.mjs [carpeta-con-copia-anterior]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const baseline = process.argv[2] && resolve(process.argv[2]);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };
const instrumentation = `<script type="application/json" id="cls-review-data">{}</script><script>
window.clsReview = { shifts: [], samples: [] };
new PerformanceObserver(list => {
  for (const e of list.getEntries()) if (!e.hadRecentInput) clsReview.shifts.push({ value:e.value, time:e.startTime, sources:e.sources.map(s=>({node:s.node?.id || s.node?.className || s.node?.nodeName, before:s.previousRect.toJSON(), after:s.currentRect.toJSON()})) });
}).observe({type:'layout-shift',buffered:true});
const sample = () => clsReview.samples.push({time:performance.now(), footer:document.querySelector('footer')?.getBoundingClientRect().top, content:document.querySelector('#contenido')?.getBoundingClientRect().height, photos:document.querySelectorAll('.galeria-foto').length, fonts:document.fonts.status});
document.addEventListener('DOMContentLoaded',sample);
setTimeout(sample,500); setTimeout(sample,2200); setTimeout(sample,4500); setTimeout(sample,6500);
setInterval(() => { document.getElementById('cls-review-data').textContent = JSON.stringify(clsReview); }, 100);
</script>`;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const match = url.pathname.match(/^\/(antes|despues|normal|error|vacio|pocas|rotas|vivo)\/(.+)$/);
  if (!match) { res.writeHead(404); res.end('Use /normal/sermones.html o /despues/galeria.html'); return; }
  const [, mode, file] = match;
  if (mode === 'antes' && !baseline) { res.writeHead(404); res.end('Indique una carpeta con la copia anterior al iniciar el servidor.'); return; }
  // Servir únicamente archivos públicos; nunca app/, credenciales ni .git/.
  if (!/^(?:[a-z-]+\.(?:html|css|js)|data\/(?:fotos|videos)\.json|img\/[^/]+\.(?:jpg|jpeg|png))$/i.test(file)) { res.writeHead(404); res.end(); return; }
  try {
    let bytes;
    if (mode === 'antes' && baseline) {
      try { bytes = await readFile(resolve(baseline, file)); } catch { /* datos e imágenes compartidos */ }
    }
    bytes ??= await readFile(resolve(root, file));
    if (['antes', 'despues'].includes(mode) && (file === 'script.js' || file.startsWith('data/'))) await new Promise(r => setTimeout(r, 1800));
    if (file === 'data/fotos.json') {
      if (mode === 'error') { res.writeHead(503); res.end(); return; }
      if (mode === 'vacio') bytes = Buffer.from(JSON.stringify({ fotos: [] }));
      if (mode === 'pocas') bytes = Buffer.from(JSON.stringify({ fotos: JSON.parse(bytes).fotos.slice(0, 5) }));
      if (mode === 'rotas') bytes = Buffer.from(JSON.stringify({ fotos: JSON.parse(bytes).fotos.map(f => ({...f, thumb:'imagen-inexistente.jpg'})) }));
    }
    if (file === 'data/videos.json' && mode === 'vivo') bytes = Buffer.from(JSON.stringify({...JSON.parse(bytes), envivo:true}));
    if (extname(file) === '.html') {
      let html = bytes.toString();
      // El diagnóstico local no envía visitas al servicio de Analytics.
      html = html.replace(/<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->/g, '');
      // Simula a alguien que llega al pie mientras JavaScript sigue descargándose.
      const scroll = url.searchParams.get('vista') === 'pie' ? '<script>setTimeout(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"}),700)</script>' : '';
      bytes = Buffer.from(html.replace('<head>', '<head>' + instrumentation + scroll));
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(8765, '127.0.0.1', () => console.log('Revisión local: http://127.0.0.1:8765/normal/sermones.html'));
