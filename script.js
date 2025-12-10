

document.addEventListener('DOMContentLoaded', function() {
    const acordeonTitulos = document.querySelectorAll('.acordeon-titulo');

    acordeonTitulos.forEach(titulo => {
        titulo.addEventListener('click', function() {
            // Utilizamos 'closest' para encontrar el contenedor principal (.acordeon-item)
            // de forma segura, incluso si el 'titulo' no es su hijo directo.
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
            
            // --- El código de despliegue/ocultamiento continua aquí ---
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
                // IMPORTANTE: Este es el cálculo que usa scrollHeight
                contenidoActual.style.maxHeight = contenidoActual.scrollHeight + "px";
            } else {
                itemActual.classList.remove('activo');
                contenidoActual.style.maxHeight = "0";
            }
        });
    });
});