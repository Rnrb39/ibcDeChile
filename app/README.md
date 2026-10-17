# Candidata de audio para el 18 de octubre de 2026

La candidata principal está en `/app/`, con once MP3 de R2 y la misma identidad
instalable. El prototipo `/app/audio/` se conserva solo localmente y queda excluido
de Git y de la publicación. La aplicación y sus pruebas no dependen de él. Esta candidata permanece
local y no se ha publicado. Las secciones siguientes documentan etapas anteriores
de video; la guía vigente es [RELEASE-AUDIO.md](RELEASE-AUDIO.md).

# PWA IBC de Chile — primera versión local

Prototipo independiente del sitio público. No cambia el inicio, `script.js`, los JSON de Facebook ni su workflow. No escribe en R2, bases de datos o el panel administrativo.

## Vista local

Con Apache de XAMPP iniciado, abrir http://localhost/ibcDeChile/app/.
No abrir el HTML mediante `file://`: el catálogo y el service worker necesitan HTTP.

La ruta prevista después de una publicación autorizada es `/app/`. El manifiesto y el service worker utilizan rutas relativas para funcionar también debajo de `/ibcDeChile/app/` en XAMPP.

## Archivos

- `index.html`: interfaz, reproductor HTML5 con `controls` y `playsinline`, secciones desplegables y ayuda de instalación.
- `app.css`: diseño adaptable, texto base de 20 px, controles de al menos 56 px y foco visible.
- `app.js`: carga del catálogo, selección/reproducción, errores recuperables y puntos de integración para subtítulos/transcripciones.
- `catalog-utils.js`: validación de registros, fechas confirmadas y ordenación, compartidas con las pruebas.
- `catalog.json`: diez registros procedentes de `mensajesColosenses` del `script.js` existente; fechas estimadas sustituidas por `null`. No se ejecuta el JavaScript de la página pública.
- `manifest.webmanifest`: identidad e instalación de la aplicación, limitada a su directorio.
- `sw.js`: caché de interfaz y catálogo; excluye R2, solicitudes de rangos, Facebook y las páginas del sitio público.
- `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png`: derivados del logo existente, sin cambiar el original.
- `tests/catalog.test.cjs`: pruebas locales del catálogo y de la interfaz con datos aislados; ejecutar `node --test app/tests/catalog.test.cjs`.

## Navegación de las grabaciones

«Predicaciones y series» muestra primero cinco sermones. «Ver sermones anteriores» despliega los restantes en la misma pantalla. Al elegir un mensaje se vuelve al reproductor integrado y se cierran ambos desplegables de sermones.

«Escuela dominical» conserva «Catecismo y confesión» y «Taller bíblico». Cada categoría sin contenido muestra únicamente «Próximamente estarán disponibles las grabaciones». No se crean controles de reproducción ni listas de anteriores vacías.

Cuando se añadan registros válidos al arreglo `sermons` con `category: "catecismo-confesion"` o `category: "taller-biblico"`, cada categoría mostrará su grabación más reciente con fecha confirmada y un botón grande «Reproducir». Las restantes se desplegarán mediante «Ver grabaciones anteriores»; todas usan el reproductor principal sin abrir otra página. El botón inicia la reproducción al tocarlo; si el navegador la bloquea, conserva el mensaje de ayuda y los controles nativos.

Los registros necesitan ID, título, categoría y URL HTTPS real. Serie, número, pasaje y predicador pueden agregarse cuando se conozcan. Para establecer con certeza cuál grabación es la más reciente se necesita una fecha confirmada. Los registros sin fecha confirmada se colocan después de los fechados y se ordenan por número dentro de la misma serie; no se inventa una fecha. Si ninguno tiene fecha, se presenta «Grabación disponible», sin afirmar que sea la más reciente.

## Videos disponibles y procedencia

Las diez URLs se extrajeron de la definición existente, incluyendo su construcción de rutas; no se descubrieron por adivinación ni se enumeró el bucket. El 12 de octubre de 2026 se verificó cada URL con una solicitud GET de rango `bytes=0-1023`: todas respondieron `206 Partial Content`, `Content-Type: video/mp4` y `Content-Range` válido.

| Mensaje | Título | URL verificada |
| --- | --- | --- |
| 1 | Problemas en medio de la Iglesia | https://videos.ibcdechile.org/colosenses-01.mp4 |
| 2 | ¿Sabes a dónde vas? ¿Sabes cuál es tu esperanza? | https://videos.ibcdechile.org/colosenses-02.mp4 |
| 3 | La solución para el error | https://videos.ibcdechile.org/colosenses-03.mp4 |
| 4 | La victoria de la fe | https://videos.ibcdechile.org/colosenses-04.mp4 |
| 5 | La supremacía del Señor | https://videos.ibcdechile.org/colosenses-05.mp4 |
| 6 | Cristo, cabeza de todo | https://videos.ibcdechile.org/colosenses-06.mp4 |
| 7 | ¿Somos amigos o enemigos de Dios? | https://videos.ibcdechile.org/colosenses-07.mp4 |
| 8 | La preocupación por la iglesia, deber de todos | https://videos.ibcdechile.org/colosenses-08.mp4 |
| 9 | La lucha por la iglesia | https://videos.ibcdechile.org/colosenses-09.mp4 |
| 10 | Soportando la presión | https://videos.ibcdechile.org/colosenses-10.mp4 |

El mensaje 10, con fecha 2026-10-04 en la fuente, aparece inicialmente como «Último sermón». Significa el más reciente del catálogo disponible; no se afirma que sea el último culto celebrado. Los mensajes 1 a 5 conservan `dateEstimated: true`, pero ahora tienen `date: null` y muestran «Fecha por confirmar». Las fechas no estimadas de los mensajes 6 a 10 se conservan. La identificación como predicaciones procede de la sección de sermones existente.

Los registros de Facebook y las listas de YouTube no proporcionan URLs R2 adicionales y no se mezclan con este catálogo. No se encontraron registros R2 de Catecismo y confesión o Taller bíblico; ambas opciones muestran un estado vacío.

## Conexión futura al panel administrativo

Esta versión lee únicamente `catalog.json`. No hay API ni sincronización automática con `ibc-admin`.

1. Acordar una exportación JSON pública o un endpoint de solo lectura del panel, sin credenciales administrativas en el navegador. El contrato de esta versión contiene `version: 1` y `sermons`.
2. Cada registro debe proporcionar ID estable, URL pública exacta del video, título, categoría, serie, número/orden, pasaje, predicador y fecha real del mensaje. Conservar la indicación de fecha estimada donde corresponda. Definir además estado de publicación y fecha de actualización; el endpoint público debe excluir borradores.
3. Confirmar las fechas de los mensajes 1 a 5 y clasificar los videos de Escuela dominical: `catecismo-confesion` o `taller-biblico`. Faltan sus URLs verificadas y sus metadatos. La interfaz ya procesa las tres categorías; al conectar el panel se deben proporcionar los registros reales. Si aparecen más series de predicaciones, preparar su agrupación y reemplazar el encabezado fijo «Colosenses».
4. Proporcionar subtítulos revisados en WebVTT mediante `captionsUrl` y texto revisado mediante `transcriptText`. Ambos están en `null`; no se generan ni inventan contenidos. «Leer el mensaje» se habilita solo cuando existe texto. Si se incorporan pistas remotas, verificar CORS del video y del archivo VTT para el origen de la app, porque entonces el reproductor utilizará `crossorigin="anonymous"`. No se cambió CORS en esta tarea.
5. Si el catálogo se sirve desde otro origen, acordar CORS y la estrategia de actualización/caché. Ajustar la selección de «último» para considerar únicamente sermones publicados con fecha confirmada o una selección editorial explícita.

## PWA y conectividad

El service worker guarda únicamente archivos pequeños de interfaz y catálogo; los videos no se descargan ni almacenan para uso sin conexión. Después de una primera visita correcta, la interfaz puede recuperarse desde caché. Los cambios del service worker se activan al cerrar las pestañas anteriores; incrementar su versión cuando cambie el conjunto de archivos.

Instalación prevista en Android y iPhone a través del navegador. La instalación y el service worker requieren HTTPS o localhost; un teléfono que visite la IP de este PC por HTTP no tendrá las mismas capacidades. La compatibilidad utiliza características estándar, pero queda pendiente la prueba en dispositivos físicos antes de publicar.

Referencias: [instalación PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [reproductor HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).

## Verificaciones realizadas

- `node --check app/app.js` y `node --check app/sw.js`.
- En la primera versión se compararon los diez registros con `mensajesColosenses`. En esta actualización se conservan URLs, títulos y fechas no estimadas; únicamente las cinco fechas estimadas se sustituyen por `null`.
- Prueba aislada del service worker con red simulada: sirve interfaz online, recupera caché ante error de red y no intercepta R2, raíz del sitio ni solicitudes de rango. Verificación de la existencia de todos sus recursos y del alcance del manifiesto.
- Navegador local en XAMPP: carga inicial, reproducción real de los mensajes 10 y 1, pausa, selección con traslado del foco al reproductor y opciones de Escuela dominical.
- Vistas de 390 y 320 px sin desbordamiento horizontal; consola sin errores ni advertencias observadas.
- No se probó todavía la instalación en teléfonos reales, la descarga inicial sin conexión ni una reproducción completa de los diez videos. La verificación HTTP de los diez enlaces no sustituye estas pruebas.

La primera versión fue probada satisfactoriamente en Android por el usuario. Para esta actualización hay ocho pruebas automáticas: fechas desconocidas/imposibles/estimadas, orden cronológico, cinco sermones visibles, ausencia de controles vacíos y categorías de Escuela dominical con cero, una o varias grabaciones. Los ejemplos de Escuela dominical existen solo en las pruebas y reutilizan una URL verificada sin acceder a la red; no se añadieron al catálogo real.

Repetir en el teléfono: abrir los cinco sermones recientes y desplegar/contraer los anteriores; elegir uno con «Fecha por confirmar» y reproducir/pausar; abrir ambas categorías de Escuela dominical y comprobar el mensaje vacío; probar orientación vertical/horizontal, pantalla completa y botones sin desplazamiento horizontal. Si se conserva una versión anterior, cerrar las pestañas y la aplicación instalada y volver a abrir con conexión para activar el nuevo service worker (caché v2).

## Segunda etapa, fase 1: controles y continuidad de escucha

La primera versión está publicada. Esta fase permanece únicamente local, en `codex/pwa-fase1-continuidad`, pendiente de revisión y sin commit, push, Pull Request ni despliegue.

- Se conservan el catálogo existente, las categorías y el reproductor HTML5. No se conecta todavía el catálogo dinámico ni se añaden API experimentales para llamadas.
- Botones grandes «Retroceder 15 segundos» y «Avanzar 15 segundos», disponibles cuando el video tiene metadatos válidos. Se limitan al inicio/final sin iniciar ni pausar la reproducción. En pantallas pequeñas se apilan.
- `playback-progress.js` guarda una sola reproducción en `localStorage`, con la clave `ibc-pwa:last-playback:v1`: ID, posición en segundos, duración, versión del video y fecha UTC. No hay cuentas, cookies nuevas ni envío de este progreso a un servidor.
- El catálogo actual no declara `videoVersion`; se utiliza `url:<URL existente>` como identidad de versión. Una revisión explícita futura tendrá prioridad. Cambiar la URL invalida el progreso; también se comprueba un cambio de duración superior a dos segundos. Reemplazar el archivo por otro con la misma URL y duración no puede detectarse con los metadatos actuales; al coordinar el catálogo público se deberá proporcionar una revisión real del video.
- Desde 30 segundos de avance y antes de los últimos 30 segundos, se muestran el título y los botones «Continuar desde MM:SS» y «Escuchar desde el principio». No se reproduce automáticamente al abrir o volver a cargar la aplicación.
- Se guarda cada diez segundos mientras se reproduce, mediante eventos del reproductor y un temporizador, además de pausa, cambios de predicación, `pagehide` y ocultación de la página. **La ocultación solo guarda; nunca pausa**, para conservar el comportamiento de pantalla apagada ya comprobado en el Samsung.
- Al cambiar de video se guarda primero el contenido saliente. Seleccionar un mensaje sin reproducirlo no reemplaza la última escucha. Las restauraciones pendientes se cancelan al cambiar de selección.
- `ended` o llegar a los últimos 30 segundos elimina la continuidad del mensaje terminado. Los registros caducan a los 90 días y se limpian si tienen datos inválidos, no corresponden a un registro del catálogo o cambió la versión del video.
- Si el almacenamiento falla, se muestra un aviso y los videos siguen funcionando. La continuidad tras cerrar la aplicación no se puede asegurar cuando el navegador bloquea o elimina sus datos.
- Al seleccionar un mensaje, el foco pasa al título visible. Se conservan las etiquetas del reproductor y los controles nativos.
- La caché de interfaz pasa a v6 y añade el nuevo módulo; no guarda videos ni borra el progreso de `localStorage`. El aviso de actualización conserva su comportamiento voluntario.
- Las capturas `tests/preview-*.png` se conservan localmente y están excluidas mediante `tests/.gitignore`.

### Pruebas de esta fase

Ejecutar desde la raíz del repositorio:

```text
node --test app/tests/catalog.test.cjs app/tests/pwa.test.cjs app/tests/progress.test.cjs app/tests/categories-progress.test.cjs
```

Las pruebas nuevas verifican los límites de 30 segundos, caducidad de 90 días, datos corruptos, errores de lectura/escritura/borrado, versiones, cambios de mensaje, posiciones fuera de rango, restauración tras abrir de nuevo, finalización, eventos en segundo plano sin pausa y conservación del punto ante errores de reproducción.

`categories-progress.test.cjs` verifica continuidad, inicio desde cero y ±15 segundos en Predicaciones, Catecismo y confesión y Taller bíblico; incluye los seis cambios entre categorías, las grabaciones anteriores de Escuela Dominical y fallos de almacenamiento. Los datos de Escuela Dominical son ficticios y solo viven en esta prueba. El reproductor se simula: no se descargan videos ni se modifica el catálogo público. Seleccionar otra grabación no reproduce por sí solo; los botones explícitos de reproducción conservan su comportamiento actual.

### Prueba local desde Samsung

1. Mantener Apache de XAMPP activo y conectar PC y teléfono a la misma red Wi-Fi. Abrir en el navegador del Samsung `http://IP-DEL-PC/ibcDeChile/app/`, usando la IPv4 del PC obtenida con `ipconfig`. El `localhost` del teléfono no apunta al PC.
2. Reproducir un mensaje; probar ±15 segundos y avanzar más de 30 segundos. Pausar y comprobar ambos botones de continuidad y el título correcto.
3. Cerrar la pestaña y volver a abrir exactamente la misma URL. Debe aparecer el punto guardado y no sonar nada. Probar «Continuar» y después «Escuchar desde el principio».
4. Cambiar de mensaje y comprobar que se guarda la última reproducción, sin confundir IDs. Acercarse a los últimos 30 segundos y comprobar que no se ofrece continuar desde el final.
5. Reproducir, bloquear la pantalla y escuchar unos minutos. Al regresar, pausar y comprobar el punto. También revisar la interfaz en vertical/horizontal y con TalkBack.

La URL local por IP usa HTTP: permite probar controles y almacenamiento, pero no instala/actualiza el service worker como la URL pública HTTPS. Es otro origen, por lo que su progreso no se comparte con la PWA pública instalada. La actualización de la versión instalada y las pruebas físicas en iPhone requerirán una prueba HTTPS posterior, con autorización de publicación. Esta fase no modifica la versión pública.
