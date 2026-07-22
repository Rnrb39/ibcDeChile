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
// 2. BASE DE DATOS DE SERMONES INDIVIDUALES
// ==========================================
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

// ==========================================
// 3. RENDERIZADO DINÁMICO
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("Cargando componentes...");

    // A. MENÚ HAMBURGUESA
    const menuToggle = document.getElementById('menuHamburguesa') || document.querySelector('.menu-hamburguesa');
    const navegacion = document.getElementById('navegacionPrincipal') || document.querySelector('.navegacion');

    if (menuToggle && navegacion) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navegacion.classList.toggle('activo');
            menuToggle.classList.toggle('activo');
        });

        document.addEventListener('click', (e) => {
            if (!navegacion.contains(e.target) && !menuToggle.contains(e.target)) {
                navegacion.classList.remove('activo');
                menuToggle.classList.remove('activo');
            }
        });
    }

    // B. ACORDEÓN (DECLARACIÓN DE FE)
    const acordeonTitulos = document.querySelectorAll('.acordeon-titulo');
    acordeonTitulos.forEach(titulo => {
        titulo.addEventListener('click', function() {
            const itemActual = this.closest('.acordeon-item');
            if (!itemActual) return;

            const contenidoActual = itemActual.querySelector('.acordeon-contenido');
            if (!contenidoActual) return;
            
            const estaActivo = itemActual.classList.contains('activo');

            document.querySelectorAll('.acordeon-item.activo').forEach(otroItem => {
                if (otroItem !== itemActual) {
                    const otroContenido = otroItem.querySelector('.acordeon-contenido');
                    otroItem.classList.remove('activo');
                    if (otroContenido) otroContenido.style.maxHeight = '0';
                }
            });

            if (!estaActivo) {
                itemActual.classList.add('activo');
                contenidoActual.style.maxHeight = contenidoActual.scrollHeight + "px";
            } else {
                itemActual.classList.remove('activo');
                contenidoActual.style.maxHeight = "0";
            }
        });
    });

    // C. CARGAR LISTAS DE REPRODUCCIÓN (Página sermones.html)
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

    // D. CARGAR TODOS LOS SERMONES (Página sermones.html)
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

    // E. CARGAR SÓLO LOS ÚLTIMOS 3 SERMONES (Página principal index.html)
    const contenedorUltimos = document.getElementById('contenedorUltimosSermones');
    if (contenedorUltimos) {
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