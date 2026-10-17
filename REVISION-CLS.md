# Revisión local de estabilidad visual — 17 de octubre de 2026

Actualización de prepublicación: ver `PREPUBLICACION.md`. Por decisión del usuario, CLS y catálogo automático son entregas independientes. Esta candidata es apta para el alcance visual del sitio estático, sin regresiones detectadas en las comprobaciones. El generador sigue siendo un respaldo temporal; no se ha implementado el flujo automático desde catálogo y su ausencia no bloquea esta entrega de CLS.

Rama: `codex/estabilidad-visual-publica`. Git estaba limpio al empezar. Se creó la rama desde el estado que ya estaba abierto, conservando su historial, incluidos los trabajos anteriores de la PWA. No se modificó `app/`, `ibc-admin`, los datos de Facebook, su automatización ni los archivos de R2. No se publicaron cambios.

## Causas comprobadas

- **Galería:** el HTML inicial solo contenía una línea de carga. Tras descargar JavaScript y `data/fotos.json`, se insertaban 30 celdas. Las imágenes ya tenían atributos 400×400 y las celdas proporción 1:1: el gran salto procedía de insertar toda la cuadrícula, no de decodificar las imágenes. El pie se desplazó entre 1.990 y 2.515 px en las pruebas. El `footer` aparece en las fuentes de Layout Instability porque es desplazado por el contenido anterior.
- **Sermones:** Colosenses, Efesios y los destacados estaban vacíos en el HTML inicial. Su inserción después de descargar el script aumentaba la altura del contenido entre 1.308 y 2.046 px. Al bajar al pie durante esa descarga, se reprodujeron saltos atribuidos al pie, la sección de sermones y el separador. Que Analytics señale `#contenido` o el pie no significa que esos elementos sean el origen de la expansión.
- **Medios:** los contenedores tenían `aspect-ratio`, pero los reproductores seguían participando en el flujo con alturas porcentuales. Ahora están posicionados dentro del marco reservado para que las dimensiones intrínsecas o los controles no alteren la altura. Se comprobó que el marco y el MP4 miden lo mismo después de reproducir.
- **Fuentes:** en la primera visita se observó además un salto pequeño (0,0014) al cambiar las métricas del texto de cabecera/navegación. No fue la causa de los saltos grandes reproducidos; se conservó la tipografía y su carga existentes para limitar el alcance.

## Correcciones

- `sermones.html` incluye las tarjetas completas desde la primera respuesta. `script.js` añade los eventos sin volver a insertarlas ni recargar inicialmente el MP4. El catálogo sigue siendo único: el HTML se genera desde las mismas funciones/datos del script.
- `galeria.html` reserva doce cuadrados antes de recibir datos. `script.js` pagina todas las fotos en grupos de doce; la última página conserva los espacios sobrantes. Los errores de imágenes, JSON vacío o no disponible mantienen el espacio y ofrecen la alternativa de Facebook. La paginación funciona con teclado. Al cerrar el visor se restaura el foco.
- `main.css` contiene la reserva de espacios, los controles de paginación y el marco estable de videos/iframes.
- Ambas páginas usan `main.css?v=cls-20261017` y `script.js?v=cls-20261017`.
- No se agregaron dependencias ni servicios. Los scripts de generación, prueba y diagnóstico usan únicamente módulos de Node.

## Comparación en navegador

Servidor ligado a `127.0.0.1`, con caché desactivada y retardos de 1,8 s para JavaScript y 1,8 s para los JSON. Se midieron entradas `layout-shift` sin interacción reciente. En sermones se simuló llegar al pie a los 700 ms, mientras el script seguía descargándose. En la vista inicial superior de sermones, el mismo crecimiento quedaba fuera de pantalla y no siempre producía CLS.

| Página y escenario | Ancho solicitado | CLS antes | CLS después |
| --- | ---: | ---: | ---: |
| Galería, carga inicial | 1366 px | 0,776 | 0 |
| Galería, carga inicial | 390 px | 0,548 | 0 |
| Galería, carga inicial | 320 px | 0,387 | 0 |
| Sermones, bajar durante descarga | 1366 px | 0,484 | 0 |
| Sermones, bajar durante descarga | 390 px | 0,687 | 0 |
| Sermones, bajar durante descarga | 320 px | 0,816 | 0 |

La primera medición fría de galería tuvo además 0,0014 por fuentes, anterior a la inserción de fotos. Los valores de la tabla corresponden al salto reproducido por contenido. Son resultados de laboratorio, no sustituyen la distribución real de Cloudflare ni garantizan CLS cero en todos los dispositivos o condiciones.

También se comprobó:

- Sin desbordamiento horizontal en 320 y 390 px, y revisión en escritorio de 1366 px.
- Doce fotos iniciales, páginas 13–24 y 25–30, altura constante en la última página, cinco fotos, JSON no disponible e imágenes deliberadamente fallidas.
- Fotos reales, apertura del visor, Escape y retorno del foco. Menú abierto/cerrado con Escape. Paginación mediante Enter.
- Un único MP4, `controls`, `playsinline`, `preload="none"`, sin autoplay. Reproducción real del mensaje 11 con avance observado hasta 13,4 s, y cambio por teclado al mensaje 1 con pausa y tiempo cero.
- Efesios conserva el iframe de YouTube; ambos destacados conservan sus miniaturas y enlaces. Facebook resuelve el JSON actual y el estado en vivo simulado. La automatización no se ejecutó ni se alteró.
- Cinco pruebas automáticas aprobadas: sincronización HTML/datos, catálogo de once mensajes, fechas/URLs, escape/atributos del video, inicialización sin reconstruir tarjetas y reserva/versiones de galería.
- `node --check` de los scripts y `git diff --check` sin errores.

## Cómo revisar antes de publicar

Arrancar el servidor desde la raíz del proyecto:

```powershell
node scripts/cls-preview.mjs
```

- [Sermones, carga normal](http://127.0.0.1:8765/normal/sermones.html)
- [Galería, carga normal](http://127.0.0.1:8765/normal/galeria.html)
- [Sermones, carga lenta y llegada al pie](http://127.0.0.1:8765/despues/sermones.html?vista=pie)
- [Galería, carga lenta](http://127.0.0.1:8765/despues/galeria.html)
- Casos de galería: `/error/galeria.html`, `/vacio/galeria.html`, `/pocas/galeria.html`, `/rotas/galeria.html`. Son simulaciones del servidor local; no modifican datos ni servicios.

Para comparar con la copia original conservada fuera de Git:

```powershell
node scripts/cls-preview.mjs "RUTA_A_LA_COPIA_ANTERIOR"
```

Usar `/antes/galeria.html` y `/antes/sermones.html?vista=pie` frente a las rutas `/despues/`. El servidor omite el beacon de Analytics únicamente en las respuestas de diagnóstico para no registrar estas visitas; los HTML del proyecto conservan la integración. Se detiene con Ctrl+C.

Las mediciones completas y las capturas se conservaron como artefactos locales de revisión, fuera del repositorio: `cls-mediciones.json`, `cls-galeria-390.jpg`, `cls-galeria-320.jpg` y `cls-sermones-390.jpg`.

## Mantenimiento y pendientes

Al cambiar mensajes, series o sus plantillas en `script.js`, ejecutar:

```powershell
node scripts/generar-sermones.mjs
node --test tests/public-site.test.mjs
```

La prueba `--check` detecta si el HTML quedó desactualizado. No es necesario Node en el alojamiento: se publican archivos estáticos.

No quedan fallos funcionales conocidos en el alcance probado. La reserva de doce celdas deja espacio libre en páginas incompletas y en el estado de error, deliberadamente para conservar la posición del contenido. Queda pendiente confirmar la mejora en las métricas reales de Cloudflare después de una publicación autorizada; el pequeño efecto de fuentes puede seguir variando entre navegadores.
