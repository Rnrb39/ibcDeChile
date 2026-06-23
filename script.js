

document.addEventListener('DOMContentLoaded', function() {
    
    /* ==========================================================================
       1. CÓDIGO DEL MENÚ HAMBURGUESA (MÓVIL)
       ========================================================================== */
    const botonMenu = document.querySelector('.menu-hamburguesa');
    const menuNavegacion = document.querySelector('.navegacion');

    if (botonMenu && menuNavegacion) {
        botonMenu.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita que el clic se propague a otros elementos
            botonMenu.classList.toggle('activo');
            menuNavegacion.classList.toggle('activo');
        });
        
        // Cierra el menú automáticamente si haces clic fuera de él
        document.addEventListener('click', function(e) {
            if (!menuNavegacion.contains(e.target) && !botonMenu.contains(e.target)) {
                botonMenu.classList.remove('activo');
                menuNavegacion.classList.remove('activo');
            }
        });
    }


    /* ==========================================================================
       2. CÓDIGO DEL ACORDEÓN (DECLARACIONES DE FE)
       ========================================================================== */
    const acordeonTitulos = document.querySelectorAll('.acordeon-titulo');

    acordeonTitulos.forEach(titulo => {
        titulo.addEventListener('click', function() {
            const itemActual = this.closest('.acordeon-item');
            
            if (!itemActual) { 
                return;
            }

            const contenidoActual = itemActual.querySelector('.acordeon-contenido');
            
            if (!contenidoActual) {
                return;
            }
            
            const estaActivo = itemActual.classList.contains('activo');

            // 1. Cerrar todos los demás elementos
            document.querySelectorAll('.acordeon-item.activo').forEach(otroItem => {
                if (otroItem !== itemActual) {
                    const otroContenido = otroItem.querySelector('.acordeon-contenido');
                    otroItem.classList.remove('activo');
                    if (otroContenido) {
                        otroContenido.style.maxHeight = '0';
                    }
                }
            });

            // 2. Abrir o cerrar el elemento actual
            if (!estaActivo) {
                itemActual.classList.add('activo');
                contenidoActual.style.maxHeight = contenidoActual.scrollHeight + "px";
            } else {
                itemActual.classList.remove('activo');
                contenidoActual.style.maxHeight = "0";
            }
        });
    });
});
