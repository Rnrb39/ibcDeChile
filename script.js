document.addEventListener('DOMContentLoaded', function() {
    
    /* ==========================================================================
       1. CÓDIGO DEL MENÚ HAMBURGUESA (Para todas las páginas)
       ========================================================================== */
    const botonMenu = document.querySelector('.menu-hamburguesa');
    const menuNavegacion = document.querySelector('.navegacion');

    if (botonMenu && menuNavegacion) {
        // Evento al hacer clic en el botón de tres líneas
        botonMenu.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita que el clic cierre el menú inmediatamente
            botonMenu.classList.toggle('activo');
            menuNavegacion.classList.toggle('activo');
        });

        // Cerrar el menú automáticamente si el usuario hace clic en el fondo de la pantalla
        document.addEventListener('click', function(e) {
            if (!menuNavegacion.contains(e.target) && !botonMenu.contains(e.target)) {
                botonMenu.classList.remove('activo');
                menuNavegacion.classList.remove('activo');
            }
        });
    }


    /* ==========================================================================
       2. CÓDIGO DEL ACORDEÓN (Sólo se ejecuta en las páginas que lo usen)
       ========================================================================== */
    const acordeonTitulos = document.querySelectorAll('.acordeon-titulo');

    // Comprobamos si existen acordeones en la página actual para evitar errores de ejecución
    if (acordeonTitulos.length > 0) {
        acordeonTitulos.forEach(titulo => {
            titulo.addEventListener('click', function() {
                const itemActual = this.closest('.acordeon-item');
                if (!itemActual) return;

                const contenidoActual = itemActual.querySelector('.acordeon-contenido');
                if (!contenidoActual) return;
                
                const estaActivo = itemActual.classList.contains('activo');

                // 1. Cerrar los otros acordeones que estén abiertos en la página
                document.querySelectorAll('.acordeon-item.activo').forEach(otroItem => {
                    if (otroItem !== itemActual) {
                        const otroContenido = otroItem.querySelector('.acordeon-contenido');
                        otroItem.classList.remove('activo');
                        if (otroContenido) {
                            otroContenido.style.maxHeight = '0';
                        }
                    }
                });

                // 2. Alternar la apertura/cierre del acordeón presionado
                if (!estaActivo) {
                    itemActual.classList.add('activo');
                    contenidoActual.style.maxHeight = contenidoActual.scrollHeight + "px";
                } else {
                    itemActual.classList.remove('activo');
                    contenidoActual.style.maxHeight = "0";
                }
            });
        });
    }
});
