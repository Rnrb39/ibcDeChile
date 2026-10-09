

// Consulta la API de Facebook y guarda data/fotos.json y data/videos.json
import { writeFile, mkdir } from 'node:fs/promises';

const TOKEN = process.env.FB_PAGE_TOKEN;
const PAGE = process.env.FB_PAGE_ID;

// Revisar la versión vigente en la documentación de Meta.
const VERSION = 'v26.0';

if (!TOKEN || !PAGE) {
  console.error('Faltan los secrets FB_PAGE_TOKEN y/o FB_PAGE_ID');
  process.exit(1);
}

async function fb(edge, params) {
  const url = new URL(`https://graph.facebook.com/${VERSION}/${PAGE}/${edge}`);

  url.search = new URLSearchParams({
    ...params,
    access_token: TOKEN,
  });

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    const error = json.error || {};
    // No mostrar URL ni token en los registros.
    throw new Error(
      `Facebook API: ${error.message || 'Error desconocido'} ` +
      `(código ${error.code ?? 'desconocido'})`
    );
  }

  return json;
}

const absoluta = (u) =>
  u.startsWith('/') ? `https://www.facebook.com${u}` : u;

const ahora = new Date().toISOString();

await mkdir('data', { recursive: true });

let huboErrores = false;

// ---------- VIDEOS ----------
try {
  let elegido = null;

  // Intentar consultar transmisiones en vivo.
  // Si Meta no permite esta consulta, usar /videos.
  try {
    const lv = await fb('live_videos', {
      fields: 'status,permalink_url,creation_time',
      limit: '10',
    });

    elegido = (lv.data || [])
      .filter(
        (v) =>
          ['LIVE', 'LIVE_STOPPED', 'VOD'].includes(v.status) &&
          v.permalink_url
      )
      .sort(
        (a, b) =>
          new Date(b.creation_time) - new Date(a.creation_time)
      )[0];

  } catch (e) {
    console.warn(
      'Aviso: live_videos no disponible. Se consultará /videos.'
    );
  }

  // Recuperar el último video si no se obtuvo uno desde live_videos.
  if (!elegido) {
    const vids = await fb('videos', {
      fields: 'permalink_url,created_time',
      limit: '1',
    });

    const v = vids.data?.[0];

    if (v) {
      elegido = {
        permalink_url: v.permalink_url,
        status: 'VOD',
      };
    }
  }

  if (elegido) {
    await writeFile(
      'data/videos.json',
      JSON.stringify(
        {
          url: absoluta(elegido.permalink_url),
          envivo: elegido.status === 'LIVE',
          actualizado: ahora,
        },
        null,
        2
      )
    );

    console.log('Video actualizado:', elegido.status);
  } else {
    console.warn('Aviso: Facebook no devolvió videos disponibles.');
  }

} catch (e) {
  console.error('Error en videos:', e.message);
  huboErrores = true;
}

// ---------- FOTOGRAFIAS ----------
try {
  const ph = await fb('photos', {
    type: 'uploaded',
    fields: 'images,name,created_time',
    limit: '30',
  });

  const fotos = (ph.data || [])
    .filter((p) => p.images?.length)
    .map((p) => {
      const ordenadas = [...p.images].sort(
        (a, b) => b.width - a.width
      );

      const miniatura =
        ordenadas.find((i) => i.width <= 800) ||
        ordenadas[ordenadas.length - 1];

      return {
        src: ordenadas[0].source,
        thumb: miniatura.source,
        texto: (p.name || '').slice(0, 140),
        fecha: p.created_time,
      };
    });

  if (fotos.length) {
    await writeFile(
      'data/fotos.json',
      JSON.stringify(
        {
          actualizado: ahora,
          fotos,
        },
        null,
        2
      )
    );

    console.log(`Fotos actualizadas: ${fotos.length}`);
  } else {
    console.warn('Aviso: Facebook no devolvió fotografías disponibles.');
  }

} catch (e) {
  console.error('Error en fotos:', e.message);
  huboErrores = true;
}

// ---------- RESULTADO FINAL ----------
if (huboErrores) {
  console.error(
    'La actualización de Facebook terminó con errores.'
  );
  process.exitCode = 1;
} else {
  console.log(
    'Consulta a Facebook finalizada sin errores.'
  );
}
