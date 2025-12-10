document.addEventListener('DOMContentLoaded', function() {
    // 1. Selecciona todos los títulos de acordeón
    const acordeonTitulos = document.querySelectorAll('.acordeon-titulo');

    acordeonTitulos.forEach(titulo => {
        titulo.addEventListener('click', function() {
            // Encuentra el elemento padre (el .acordeon-item)
            const item = this.parentElement;

            // Encuentra el contenido que debe expandirse
            const contenido = item.querySelector('.acordeon-contenido');

            // 2. Alternar la clase 'activo' en el elemento padre
            // Esto cambia el color del título y el signo '+' a '–' (gracias al CSS)
            item.classList.toggle('activo');

            // 3. Ajustar la altura para la animación de apertura/cierre
            if (item.classList.contains('activo')) {
                // Si está activo, establece la altura real del contenido para abrirlo suavemente
                contenido.style.maxHeight = contenido.scrollHeight + "px";
            } else {
                // Si no está activo, establece la altura a 0 para cerrarlo
                contenido.style.maxHeight = "0";
            }
        });
    });
});