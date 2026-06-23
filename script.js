

document.addEventListener('DOMContentLoaded', function() {
    
    /* ==========================================================================
       1. CÓDIGO DEL MENÚ HAMBURGUESA (MÓVIL)
       ========================================================================== */
    const botonMenu = document.querySelector('.menu-hamburguesa');
    const menuNavegacion = document.querySelector('.navegacion');

    // Verificamos que los elementos existan en la página antes de asignar el evento
    if (botonMenu && menuNavegacion) {
        botonMenu.addEventListener('click', function() {
            menuNavegacion.classList.toggle('activo');
        });
    }


    /* ==========================================================================
       2. CÓDIGO DEL ACORDEÓN (DECLARACIONES DE FE)
       ========================================================================== */
    const acordeonTitulos = document.querySelectorAll('.acordeon-titulo');

    acordeonTitulos.forEach(titulo => {
        titulo.addEventListener('click', function() {
            // Utilizamos 'closest' para encontrar el contenedor principal (.acordeon-item)
            const itemActual = this.closest('.acordeon-item');
            
            // Si el item no se encuentra, salimos para evitar el error 'null'
            if (!itemActual) { 
                console.error("El elemento .acordeon-item no fue encontrado.");
                return;
            }

            const contenidoActual = itemActual.querySelector('.acordeon-contenido');
            
            // Si el contenido tampoco se encuentra, salimos
            if (!contenidoActual) {
                 console.error("El elemento .acordeon-contenido no fue encontrado dentro de .acordeon-item.");
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
                // Cálculo dinámico usando scrollHeight
                contenidoActual.style.maxHeight = contenidoActual.scrollHeight + "px";
            } else {
                itemActual.classList.remove('activo');
                contenidoActual.style.maxHeight = "0";
            }
        });
    });
});
