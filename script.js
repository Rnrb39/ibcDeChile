


// ==========================================
// 1. BASE DE DATOS DE LISTAS DE REPRODUCCIÓN (SERIES)
// ==========================================
const playlists = [
    {
        titulo: "Serie Expositiva: Carta a los Efesios",
        descripcion: "Estudio completo a través de la carta a los Efesios.",
        cantidadMensajes: "24 Sermones",
        playlistId: "PL1NYVaAlZ1M8KJGvz5qd79WJPIy6fPnyN" // REEMPLAZA por el ID de tu lista de YouTube
    },
    
];

// ==========================================
// 2. BASE DE DATOS DE SERMONES INDIVIDUALES
// (El sermón que esté más arriba en la lista se considerará el más reciente)
// ==========================================
const sermones = [
 {
        titulo: "De la desesperanza a la Esperanza",
        pasaje: "Rut 1:15-18",
        fecha: "02 de Marzo, 2025",
        youtubeId: "ns4xn3xRGps"
    },
    {
        titulo: "Pronto se apartaron del camino en que anduvieron sus padres…",
        pasaje: "Jueces 2:17",
        fecha: "26 de Enero, 2025",
        youtubeId: "qAwtOhJqdHc"
    }
];

// ==========================================
// 3. RENDERIZADO DINÁMICO
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("Cargando componentes...");

    // A. MENÚ HAMBURGUESA
    const menuToggle = document.getElementById('menuHamburguesa');
    const navegacion = document.getElementById('navegacionPrincipal');
    if (menuToggle && navegacion) {
        menuToggle.addEventListener('click', () => {
            navegacion.classList.toggle('activo');
            menuToggle.classList.toggle('activo');
        });
    }

    // B. CARGAR LISTAS DE REPRODUCCIÓN (Página sermones.html)
    const contenedorPlaylists = document.getElementById('contenedorPlaylists');
    if (contenedorPlaylists) {
        contenedorPlaylists.innerHTML = playlists.map(serie => `
            <article class="sermon-tarjeta" style="border-top: 4px solid var(--color-primary, #1B2A4A);">
                <span style="background:#1B2A4A; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8em; font-weight:bold; display:inline-block; margin-bottom:8px;">
                    SERIE COMPLETA (${serie.cantidadMensajes})
                </span>
                <h3 class="titulo-sermon-tarjeta">${serie.titulo}</h3>
                <p class="sermon-referencia" style="margin-bottom: 12px;">${serie.descripcion}</p>
                
                <div class="video-responsive" style="margin: 10px 0;">
                    <iframe 
                        src="https://www.youtube-nocookie.com/embed/videoseries?list=${serie.playlistId}" 
                        title="${serie.titulo}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>

                <a href="https://www.youtube.com/playlist?list=${serie.playlistId}" target="_blank" rel="noopener" class="btn-principal" style="display:block; text-align:center; margin-top:10px;">
                    Ver Serie en YouTube
                </a>
            </article>
        `).join('');
    }

    // C. CARGAR TODOS LOS SERMONES (Página sermones.html)
    const contenedorSermones = document.getElementById('contenedorSermones');
    if (contenedorSermones) {
        contenedorSermones.innerHTML = sermones.map(sermon => `
            <article class="sermon-tarjeta">
                <p class="sermon-fecha">${sermon.fecha}</p>
                <h3 class="titulo-sermon-tarjeta">${sermon.titulo}</h3>
                <p class="sermon-referencia">${sermon.pasaje}</p>
                
                <a href="https://www.youtube.com/watch?v=${sermon.youtubeId}" target="_blank" rel="noopener">
                    <img src="https://img.youtube.com/vi/${sermon.youtubeId}/mqdefault.jpg" alt="${sermon.titulo}" style="width:100%; border-radius:4px; margin:10px 0;">
                </a>

                <a href="https://www.youtube.com/watch?v=${sermon.youtubeId}" target="_blank" rel="noopener" class="btn-principal btn-reproducir">
                    Ver Sermón
                </a>
            </article>
        `).join('');
    }

    // D. CARGAR SÓLO LOS ÚLTIMOS 3 SERMONES (Página principal index.html)
    const contenedorUltimos = document.getElementById('contenedorUltimosSermones');
    if (contenedorUltimos) {
        // .slice(0, 3) toma únicamente los primeros 3 elementos del arreglo
        const ultimosSermones = sermones.slice(0, 3);

        contenedorUltimos.innerHTML = ultimosSermones.map(sermon => `
            <article class="sermon-tarjeta">
                <p class="sermon-fecha">${sermon.fecha}</p>
                <h3 class="titulo-sermon-tarjeta">${sermon.titulo}</h3>
                <p class="sermon-referencia">${sermon.pasaje}</p>
                
                <a href="https://www.youtube.com/watch?v=${sermon.youtubeId}" target="_blank" rel="noopener">
                    <img src="https://img.youtube.com/vi/${sermon.youtubeId}/mqdefault.jpg" alt="${sermon.titulo}" style="width:100%; border-radius:4px; margin:10px 0;">
                </a>

                <a href="https://www.youtube.com/watch?v=${sermon.youtubeId}" target="_blank" rel="noopener" class="btn-principal btn-reproducir">
                    Ver Sermón
                </a>
            </article>
        `).join('');
    }
});