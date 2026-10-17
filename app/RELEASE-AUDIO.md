# Candidata de audio · IBC de Chile

Preparada el viernes 16 de octubre de 2026 para revisión antes del domingo 18.
No se ha hecho commit, push ni despliegue de esta candidata.

## Enlace e instalación

La candidata sustituye el reproductor de `/app/` por HTML5 `<audio>`.
La URL pública seguirá siendo `https://ibcdechile.org/app/` cuando se autorice
publicar. El manifiesto no cambió: mismo `id`, `start_url`, `scope`, nombre e
iconos. Quien ya la instaló en un dispositivo de prueba podrá actualizarla;
no necesita instalar otra aplicación. `/app/audio/` permanece solo localmente,
ignorado por Git y excluido de la publicación; no es una dependencia de la
aplicación ni de las pruebas públicas.

La rama continúa en `codex/pwa-audio-prototipo`. Se ejecutó `git fetch origin`:
`origin/main` contiene el merge `78971a3` del mensaje 11 de la web oficial.
Se integraron esos cambios mediante avance directo (`git merge --ff-only`), sin
crear un commit. Las huellas de todos los archivos de `/app/`, incluidos los
locales ignorados, coincidieron antes y después de la integración. La diferencia
respecto a `origin/main` afecta únicamente a `/app/`; `script.js` y
`sermones.html` son idénticos a la versión remota actualizada.

El responsable confirmó las pruebas reales satisfactorias en Samsung S25 FE:
los once MP3, ±15 segundos, continuar, reiniciar, pantalla apagada, segundo plano
y recuperación después de perder Internet. La recuperación fue manual, sin
reproducción inesperada. Las pruebas automatizadas se repitieron después de
integrar `main`: 95 aprobadas, sin fallos. Sigue pendiente la validación de
instalación/actualización por HTTPS y la comprobación específica del Galaxy A10s.

## Audios y catálogo

`catalog.json` tiene once registros con IDs `colosenses-01` a `colosenses-11`.
Las URLs MP3 están declaradas explícitamente; no hay URLs MP4 ni fallback a video.
Los diez mensajes anteriores conservan sus metadatos. Los primeros cinco tienen
fecha desconocida y se presentan como «Fecha por confirmar», sin estimaciones.
El mensaje 11 es «Completos en Él», Colosenses 2:8-10, del 11 de octubre de 2026,
predicado por Pastor Sergio Arias Cáceres.

Cada URL se verificó individualmente mediante HEAD 200, tipo `audio/mpeg`,
solicitud de los primeros 64 bytes con HTTP 206 y firma MP3. Después se reprodujo
cada MP3 en el navegador HTML5 y se comprobó duración y avance de posición sin
errores del reproductor. Esto no sustituye escuchar el mensaje completo ni la
prueba física en Samsung.

Cada registro incluye `audioVersion` del ETag comprobado en R2,
`audioSizeBytes` y `audioDurationSeconds` obtenida del reproductor. Al reemplazar
un archivo se debe actualizar su versión. El catálogo dinámico administrativo
sigue fuera de esta entrega. Escuela dominical conserva sus dos categorías
vacías; sus ejemplos ficticios solo existen en pruebas.

La candidata usa exclusivamente su `catalog.json`. El adaptador de producción
solo acepta URLs MP3 HTTPS absolutas, sin credenciales ni hosts privados, y no
ofrece configuraciones locales ni sustituciones desde el prototipo. El primer
MP3 local y su configuración se conservan fuera de Git y no se utilizan.

## Carga y progreso

Al abrir, seleccionar otra grabación, volver o recargar, no se asigna `src`
al audio ni se llama a reproducir. `preload="none"` evita carga anticipada.
Solo Reproducir, Continuar o Escuchar desde el principio adjuntan la URL y
solicitan audio. Al cambiar de mensaje se pausa y desconecta el anterior.
Una reproducción solicitada sí puede usar el búfer HTTP normal del navegador.

Se conservan ±15 segundos, un único progreso local con ID, tipo de medio,
versión, posición, duración y fecha, umbral de 30 segundos, final a 30 segundos
del término o `ended` y caducidad de 90 días. Una versión o duración incompatible
impide retomar la posición. La clave de audio del prototipo permanece estable
para conservar las pruebas de audio hechas en el mismo origen. No se reutiliza
ni elimina la clave de progreso de MP4.

La ocultación y `pagehide` guardan progreso, sin pausar. Hay comprobaciones cada
diez segundos durante la reproducción y en eventos del medio. Android puede
suspender o cerrar procesos; no se puede garantizar reproducción si el sistema
mata Chrome, se pierde conexión o se cierra forzosamente la aplicación.
No se agregaron API experimentales para llamadas ni funciones secundarias.

## Actualización desde video

`sw.js` conserva URL, alcance y prefijo de caché, y crea `v7-audio` con todos los
archivos necesarios. La instalación vuelve a validar la red y solo se completa
si se guarda el shell entero. Al activar se eliminan las cachés anteriores de
esta misma aplicación, incluidas v5/v6, preservando la web y el prototipo.
La estrategia es red primero con espera máxima de ocho segundos y respaldo de
la candidata de audio. MP3, MP4 y solicitudes Range nunca se almacenan mediante
el service worker.

El aviso «Actualizar aplicación» conserva su activación explícita y no corta una
escucha por la aparición de una actualización. El usuario de prueba debe pulsarlo
al terminar. Se verificó localmente el aviso, la activación, la recarga con audio
y once mensajes, sin `<video>` ni carga automática. Si un dispositivo está sin
conexión y aún no recibió la actualización, puede conservar su versión de video
hasta conectarse y actualizar; no debe entregarse así a los hermanos.

## Pruebas automatizadas

Desde la raíz del repositorio:

```powershell
node --test app/tests/catalog.test.cjs app/tests/progress.test.cjs app/tests/categories-progress.test.cjs app/tests/pwa.test.cjs app/tests/audio-release.test.cjs
```

Cubren once IDs, metadatos, cinco mensajes visibles y seis anteriores, ausencia
de autoplay/carga anticipada, progreso y cambios entre las tres categorías,
errores de almacenamiento, caducidad/finalización, versión incompatible,
fallos de catálogo/red/HTTP/JSON, recuperación explícita, identidad instalable,
caché nueva completa, limpieza del video y shell de audio sin conexión.
El catálogo de video v1 en `tests/fixtures/catalog-video-v1.json` contiene
únicamente metadatos públicos de regresión. Verifica que los diez mensajes
anteriores conservan sus metadatos y que no se migra el progreso MP4 a MP3.
No es una configuración activa ni se consulta desde el navegador.

## Aprobación en Samsung S25 FE y Galaxy A10s

1. Mantener Apache activo, PC encendido y teléfono en la misma Wi-Fi. Abrir Chrome
   en `http://192.168.1.10/ibcDeChile/app/`. Si cambia la IP del PC, sustituirla.
   En el PC se usa `http://localhost/ibcDeChile/app/`.
2. Confirmar el último mensaje «Completos en Él», once audios y silencio inicial.
   Abrir Predicaciones: cinco recientes y seis bajo Ver sermones anteriores.
3. Probar unos segundos de los once mensajes; comprobar título, voz y controles.
   Seleccionar otro sin Reproducir: debe quedar en silencio, sin cargarlo.
4. Superar 30 segundos, pausar, cerrar y abrir la misma URL. Debe ofrecer Continuar
   y Escuchar desde el principio. Probar ambas opciones y ±15 mientras está
   pausado y reproduciendo. Acercarse al final: no debe ofrecer continuar allí.
5. Escuchar al menos cinco minutos con pantalla bloqueada y después usando otra
   aplicación. Verificar voz continua y posición al volver. Repetir en ambos
   teléfonos con su configuración habitual de batería.
6. Interrumpir y recuperar Internet: debe mostrar error si no hay búfer suficiente,
   conservar el progreso y permitir retomar por una acción explícita.
7. Revisar pantalla pequeña, orientación horizontal, texto ampliado y TalkBack.
   Escuela dominical debe mostrar su aviso de próximas grabaciones.

La IP local por HTTP no permite validar instalación ni actualización del service
worker en el teléfono. Antes de entregar a la congregación, aprobar una prueba
HTTPS del proceso, o autorizar la publicación controlada y realizar inmediatamente
estas verificaciones desde la URL definitiva:

- En el dispositivo con la PWA anterior, conectar Internet, actualizar, cerrar y
  abrir el mismo icono: comprobar once audios y ausencia de video.
- Instalar desde Chrome en el A10s/S25 FE sin otra instalación paralela; abrir desde
  el icono y comprobar identidad, modo aplicación y reproducción de los once audios.
- Reabrir sin Internet después de actualizar: debe verse la interfaz y catálogo
  de audio guardados; se necesita Internet para escuchar. No hay descarga completa
  automática de audios.
- Repetir pantalla apagada y cambio de aplicación desde la PWA instalada por HTTPS.

No publicar hasta aprobar la candidata, las pruebas físicas y la transición de
la instalación. El sitio oficial, Facebook y el panel administrativo quedan fuera
de este cambio.

## Selección para publicación

Se preparan exclusivamente estos 18 archivos. Los archivos sin cambios que ya
existen en Git (manifiesto, iconos, estilos base y utilidades) siguen disponibles
sin necesidad de prepararlos de nuevo.

```text
app/.gitignore
app/README.md
app/RELEASE-AUDIO.md
app/app.js
app/audio-catalog.js
app/audio.css
app/catalog.json
app/index.html
app/playback-progress.js
app/pwa.js
app/sw.js
app/tests/audio-release.test.cjs
app/tests/catalog.test.cjs
app/tests/categories-progress.test.cjs
app/tests/fixtures/catalog-video-v1.json
app/tests/helpers/interface.cjs
app/tests/progress.test.cjs
app/tests/pwa.test.cjs
```

El prototipo completo `app/audio/` se conserva localmente, ignorado y fuera del
índice. También quedan fuera MP3, MP4, capturas, configuraciones locales y archivos
temporales. La prueba de regresión v1 contiene metadatos públicos, no multimedia,
configuraciones activas ni datos administrativos. Las pruebas principales no
requieren el prototipo ni ningún archivo ignorado.
