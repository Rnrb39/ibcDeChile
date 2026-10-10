// ==========================================
// 1. BASE DE DATOS DE LISTAS DE REPRODUCCIÓN (SERIES)
// ==========================================
const playlists = [
    {
        titulo: "Serie Expositiva: Carta a los Efesios",
        descripcion: "Estudio completo a través de la carta a los Efesios.",
        cantidadMensajes: "24 Sermones",
        playlistId: "PL1NYVaAlZ1M8KJGvz5qd79WJPIy6fPnyN"
    }
];

// ==========================================
// 2. MENSAJES DE COLOSENSES Y SERMONES INDIVIDUALES
// ==========================================
const mensajesColosenses = [
    {
        titulo: "Problemas en medio de la Iglesia",
        pasaje: "Colosenses 1:1–2",
        serie: "Colosenses",
        numeroMensaje: 1,
        predicador: "Pastor Sergio Arias Cáceres",
        fecha: "2026-08-02",
        fechaEstimada: true,
        videoUrl: "https://videos.ibcdechile.org/colosenses-01.mp4"
    },
    { numeroMensaje: 2, titulo: "¿Sabes a dónde vas? ¿Sabes cuál es tu esperanza?", pasaje: "Colosenses 1:3–8", fecha: "2026-08-09", fechaEstimada: true },
    { numeroMensaje: 3, titulo: "La solución para el error", pasaje: "Colosenses 1:9–10", fecha: "2026-08-16", fechaEstimada: true },
    { numeroMensaje: 4, titulo: "La victoria de la fe", pasaje: "Colosenses 1:11–14", fecha: "2026-08-23", fechaEstimada: true },
    { numeroMensaje: 5, titulo: "La supremacía del Señor", pasaje: "Colosenses 1:15–17", fecha: "2026-08-30", fechaEstimada: true },
    { numeroMensaje: 6, titulo: "Cristo, cabeza de todo", pasaje: "Colosenses 1:18–20", fecha: "2026-09-06" },
    { numeroMensaje: 7, titulo: "¿Somos amigos o enemigos de Dios?", pasaje: "Colosenses 1:20–23", fecha: "2026-09-13" },
    { numeroMensaje: 8, titulo: "La preocupación por la iglesia, deber de todos", pasaje: "Colosenses 1:24–29", fecha: "2026-09-20" },
    { numeroMensaje: 9, titulo: "La lucha por la iglesia", pasaje: "Colosenses 2:1–5", fecha: "2026-09-27" },
    { numeroMensaje: 10, titulo: "Soportando la presión", pasaje: "Colosenses 2:6–7", fecha: "2026-10-04" }
].map(mensaje => ({
    serie: "Colosenses",
    predicador: "Pastor Sergio Arias Cáceres",
    videoUrl: `https://videos.ibcdechile.org/colosenses-${String(mensaje.numeroMensaje).padStart(2, '0')}.mp4`,
    ...mensaje
}));

const sermones = [
    {
        titulo: "De la desesperanza a la Esperanza",
        pasaje: "Rut 1:15-18",
        fecha: "02 de Marzo, 2025",
        youtubeId: "ns4xn3xRGps"
    },
    {
        titulo: "Pronto se apartaron del camino en que anduvieron sus padres...",
        pasaje: "Jueces 2:17",
        fecha: "26 de Enero, 2025",
        youtubeId: "qAwtOhJqdHc"
    }
];

const FACEBOOK_VIDEOS = 'https://www.facebook.com/IBCdeChile/videos/';
const FACEBOOK_PHOTOS = 'https://www.facebook.com/IBCdeChile/photos';
const escapar = (texto) => String(texto).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Las fechas son días de calendario: no convertirlas a una zona horaria.
function fechaEnEspanol(fecha) {
    const [ano, mes, dia] = fecha.split('-').map(Number);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dia} de ${meses[mes - 1]} de ${ano}`;
}

function cargarColosenses() {
    const contenedor = document.getElementById('contenedorColosenses');
    if (!contenedor) return;
    contenedor.innerHTML = `
        <p class="sermon-serie">Serie expositiva · 10 mensajes</p>
        <h3 class="titulo-sermon-tarjeta">Colosenses</h3>
        <label class="selector-mensaje-label" for="mensajeColosenses">Seleccionar mensaje</label>
        <select class="selector-mensaje" id="mensajeColosenses" aria-controls="detalleColosenses videoColosenses">
            ${mensajesColosenses.map(mensaje => `<option value="${mensaje.numeroMensaje}">${mensaje.numeroMensaje}. ${escapar(mensaje.titulo)}</option>`).join('')}
        </select>
        <div id="detalleColosenses" class="detalle-mensaje" aria-live="polite" aria-atomic="true"></div>
        <div class="video-responsive sermon-video"><video id="videoColosenses" controls playsinline preload="none"><source type="video/mp4">Su navegador no admite la reproducción de video. Use el enlace Abrir video.</video></div>
        <a id="enlaceColosenses" target="_blank" rel="noopener noreferrer" class="btn-principal">Abrir video <span aria-hidden="true">↗</span></a>`;
    const selector = document.getElementById('mensajeColosenses');
    const video = document.getElementById('videoColosenses');
    const mostrarMensaje = () => {
        const mensaje = mensajesColosenses.find(item => item.numeroMensaje === Number(selector.value));
        video.pause();
        video.querySelector('source').src = mensaje.videoUrl;
        video.setAttribute('aria-label', `Mensaje ${mensaje.numeroMensaje}: ${mensaje.titulo}`);
        video.load();
        document.getElementById('detalleColosenses').innerHTML = `
            <p class="sermon-serie">Serie Colosenses · Mensaje ${mensaje.numeroMensaje}</p>
            <h4>${escapar(mensaje.titulo)}</h4>
            <p class="sermon-referencia">${escapar(mensaje.pasaje)}</p>
            <p class="sermon-predicador">${escapar(mensaje.predicador)}</p>
            <p class="sermon-fecha"><time datetime="${mensaje.fecha}">${fechaEnEspanol(mensaje.fecha)}</time>${mensaje.fechaEstimada ? ' · Fecha estimada' : ''}</p>`;
        document.getElementById('enlaceColosenses').href = mensaje.videoUrl;
    };
    selector.addEventListener('change', mostrarMensaje);
    mostrarMensaje();
}

async function cargarVideo() {
    const enlace = document.getElementById('video-facebook-link');
    if (!enlace) return;
    const estado = document.getElementById('video-estado');
    const titulo = document.getElementById('video-titulo');
    const descripcion = document.getElementById('video-descripcion');
    try {
        const respuesta = await fetch('data/videos.json', { cache: 'no-store' });
        if (!respuesta.ok) throw new Error('No se pudo cargar el video');
        const datos = await respuesta.json();
        const url = new URL(datos.url);
        if (url.protocol !== 'https:' || !['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)) throw new Error('Enlace no válido');
        enlace.href = url.href;
        const enVivo = datos.envivo === true;
        estado.textContent = enVivo ? 'Transmisión en vivo' : 'Última predicación';
        titulo.textContent = enVivo ? 'Acompáñenos en la transmisión' : 'Escucha la última predicación';
        descripcion.textContent = enVivo ? 'Estamos transmitiendo nuestro culto. Puede acompañarnos desde Facebook.' : 'Accede a la grabación de nuestro culto desde Facebook.';
        enlace.replaceChildren(document.createTextNode(enVivo ? 'Ver transmisión en Facebook ↗' : 'Ver predicación en Facebook ↗'));
        const encabezado = document.getElementById('titulo-video');
        if (encabezado) encabezado.textContent = enVivo ? 'Transmisión en vivo' : 'Última predicación';
    } catch {
        enlace.href = FACEBOOK_VIDEOS;
        enlace.textContent = 'Ver videos en Facebook ↗';
        estado.textContent = 'Predicaciones en Facebook';
        titulo.textContent = 'Escucha nuestras predicaciones';
        descripcion.textContent = 'Puede consultar nuestras transmisiones directamente en Facebook.';
    }
}

async function cargarGaleria() {
    const grid = document.getElementById('galeria-grid');
    const visor = document.getElementById('lightbox');
    if (!grid || !visor) return;
    const fotoAmpliada = document.getElementById('lightbox-img');
    const cerrarBoton = document.getElementById('lightbox-cerrar');
    let origen = null;
    const fondo = [...document.body.children].filter(elemento => elemento !== visor && elemento.tagName !== 'SCRIPT');
    const cerrar = () => {
        if (visor.hidden) return;
        visor.hidden = true;
        document.body.classList.remove('visor-abierto');
        fondo.forEach(elemento => { elemento.inert = false; });
        fotoAmpliada.removeAttribute('src');
        origen?.focus();
    };
    const abrir = (foto, boton, alt) => {
        origen = boton;
        fotoAmpliada.src = foto.src;
        fotoAmpliada.alt = alt;
        visor.hidden = false;
        document.body.classList.add('visor-abierto');
        fondo.forEach(elemento => { elemento.inert = true; });
        cerrarBoton.focus();
    };
    cerrarBoton.addEventListener('click', cerrar);
    visor.addEventListener('click', e => { if (e.target === visor) cerrar(); });
    document.addEventListener('keydown', e => {
        if (visor.hidden) return;
        if (e.key === 'Escape') cerrar();
        if (e.key === 'Tab') { e.preventDefault(); cerrarBoton.focus(); }
    });
    try {
        const respuesta = await fetch('data/fotos.json', { cache: 'no-store' });
        if (!respuesta.ok) throw new Error('Sin datos');
        const datos = await respuesta.json();
        const fotos = Array.isArray(datos.fotos) ? datos.fotos : [];
        if (!fotos.length) throw new Error('Sin fotografías');
        grid.replaceChildren();
        fotos.forEach((foto, i) => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'galeria-foto';
            const alt = foto.texto || `Actividad de la iglesia, fotografía ${i + 1}`;
            boton.setAttribute('aria-label', `Ampliar fotografía ${i + 1}: ${alt}`);
            const imagen = document.createElement('img');
            imagen.src = foto.thumb || foto.src;
            imagen.alt = alt;
            imagen.loading = i < 4 ? 'eager' : 'lazy';
            imagen.decoding = 'async';
            imagen.width = 400;
            imagen.height = 400;
            imagen.addEventListener('error', () => {
                boton.replaceChildren(document.createTextNode('Fotografía no disponible'));
                boton.disabled = true;
            });
            boton.appendChild(imagen);
            boton.addEventListener('click', () => abrir(foto, boton, alt));
            grid.appendChild(boton);
        });
    } catch {
        grid.innerHTML = `<div class="galeria-mensaje galeria-error" role="status"><h2>Fotografías de nuestra iglesia</h2><p>En este momento no pudimos cargar las fotografías. Puede ver nuestras actividades en Facebook.</p><a href="${FACEBOOK_PHOTOS}" target="_blank" rel="noopener noreferrer" class="btn-principal">Ver fotografías en Facebook</a></div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const botonMenu = document.getElementById('menuHamburguesa');
    const navegacion = document.getElementById('navegacionPrincipal');
    if (botonMenu && navegacion) {
        const establecerMenu = abierto => {
            navegacion.classList.toggle('activo', abierto);
            botonMenu.classList.toggle('activo', abierto);
            botonMenu.setAttribute('aria-expanded', String(abierto));
            botonMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        };
        botonMenu.addEventListener('click', () => establecerMenu(botonMenu.getAttribute('aria-expanded') !== 'true'));
        navegacion.addEventListener('click', e => { if (e.target.closest('a')) establecerMenu(false); });
        document.addEventListener('click', e => {
            if (!navegacion.contains(e.target) && !botonMenu.contains(e.target)) establecerMenu(false);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && botonMenu.getAttribute('aria-expanded') === 'true') {
                establecerMenu(false);
                botonMenu.focus();
            }
        });
        const escritorio = matchMedia('(min-width: 901px)');
        escritorio.addEventListener('change', () => establecerMenu(false));
    }
    const titulos = [...document.querySelectorAll('.acordeon-titulo')];
    const establecerCapitulo = (boton, abierto) => {
        boton.setAttribute('aria-expanded', String(abierto));
        document.getElementById(boton.getAttribute('aria-controls')).hidden = !abierto;
    };
   titulos.forEach(titulo => titulo.addEventListener('click', () => {
        const posicionAnterior = titulo.getBoundingClientRect().top;
        const abrir = titulo.getAttribute('aria-expanded') !== 'true';

        titulos.forEach(otro => establecerCapitulo(otro, false));
        establecerCapitulo(titulo, abrir);

        const posicionNueva = titulo.getBoundingClientRect().top;

        window.scrollBy({
            top: posicionNueva - posicionAnterior,
            behavior: 'instant'
        });
    }));
    const contenedorPlaylists = document.getElementById('contenedorPlaylists');
    if (contenedorPlaylists) contenedorPlaylists.innerHTML = playlists.map(serie => `
        <article class="sermon-tarjeta">
            <p class="sermon-fecha">SERIE COMPLETA · ${escapar(serie.cantidadMensajes)}</p>
            <h3 class="titulo-sermon-tarjeta">${escapar(serie.titulo)}</h3>
            <p class="sermon-referencia">${escapar(serie.descripcion)}</p>
            <div class="video-responsive"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(serie.playlistId)}" title="${escapar(serie.titulo)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
            <a href="https://www.youtube.com/playlist?list=${encodeURIComponent(serie.playlistId)}" target="_blank" rel="noopener noreferrer" class="btn-principal">Ver serie en YouTube ↗</a>
        </article>`).join('');
    cargarColosenses();
    const contenedorSermones = document.getElementById('contenedorSermones');
    if (contenedorSermones) contenedorSermones.innerHTML = sermones.map(sermon => `
        <article class="sermon-tarjeta">
            ${sermon.fecha ? `<p class="sermon-fecha">${escapar(sermon.fecha)}</p>` : ''}
            ${sermon.serie && sermon.numeroMensaje != null ? `<p class="sermon-serie">Serie ${escapar(sermon.serie)} · Mensaje ${escapar(sermon.numeroMensaje)}</p>` : ''}
            <h3 class="titulo-sermon-tarjeta">${escapar(sermon.titulo)}</h3>
            <p class="sermon-referencia">${escapar(sermon.pasaje)}</p>
            ${sermon.videoUrl ? `
                <div class="video-responsive sermon-video"><video controls playsinline preload="none" aria-label="${escapar(sermon.titulo)}"><source src="${escapar(sermon.videoUrl)}" type="video/mp4">Su navegador no admite la reproducción de video. Use el enlace Abrir video.</video></div>
                <a href="${escapar(sermon.videoUrl)}" target="_blank" rel="noopener noreferrer" class="btn-principal">Abrir video <span aria-hidden="true">↗</span></a>
            ` : sermon.youtubeId ? `
                <a href="https://www.youtube.com/watch?v=${encodeURIComponent(sermon.youtubeId)}" target="_blank" rel="noopener noreferrer"><img src="https://img.youtube.com/vi/${encodeURIComponent(sermon.youtubeId)}/mqdefault.jpg" alt="Ver ${escapar(sermon.titulo)}" loading="lazy" width="320" height="180" style="width:100%; height:auto; margin:10px 0 20px;"></a>
                <a href="https://www.youtube.com/watch?v=${encodeURIComponent(sermon.youtubeId)}" target="_blank" rel="noopener noreferrer" class="btn-principal">Ver sermón ↗</a>
            ` : ''}
        </article>`).join('');
    cargarVideo();
    cargarGaleria();
});
