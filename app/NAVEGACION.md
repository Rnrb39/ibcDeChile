# Navegación accesible de audios

La pantalla inicial mantiene el último sermón, el botón grande Reproducir,
la continuidad de escucha y los accesos a Predicaciones y Escuela dominical.
Los controles de una serie se muestran cuando se elige una serie o grabación.

Cada serie ofrece Anterior, Siguiente, Escuchar desde el primer mensaje,
Ir al último mensaje y Elegir otro mensaje. El selector es una lista de botones
dentro de la pantalla, con cinco opciones por grupo. Solo ofrece Ver 5 grabaciones
anteriores y Ver 5 grabaciones siguientes, con la cantidad real del grupo de
destino y en singular si queda una grabación. Se ocultan los controles sin grupo
disponible. El indicador muestra, por ejemplo, Grabaciones 6–10 de 35.
En teléfonos, los dos botones conservan filas separadas, texto ajustable y
altura mínima de 56 px mediante los estilos existentes. No usa ventanas
emergentes ni un selector pequeño.

Los mensajes numerados siguen la numeración editorial. Catecismo y Confesión
conserva la lista en orden descendente por pregunta; no se sustituye por fecha de subida.
Su recorrido es ascendente: Siguiente elige la siguiente pregunta disponible de
número mayor y Anterior la de número menor. El primer mensaje corresponde a la
pregunta menor disponible y el último a la mayor, sin completar huecos.
Si el título ya incluye su número de pregunta, se muestra íntegro una sola vez,
siempre como texto.
Los registros sin número no reciben números inventados. No se cambia el catálogo.

Se mantiene un único reproductor MP3. Seleccionar otro mensaje pausa y desconecta
el anterior sin cargar el nuevo; solo una acción de reproducción explícita carga
audio. Los estados Reproduciendo/Pausado se anuncian con texto. El progreso y
los controles de quince segundos conservan el módulo existente.

El catálogo se consulta al abrir, al recuperar conexión/volver a primer plano
(con un límite de una consulta cada treinta segundos) y cada cinco minutos
mientras la pantalla está activa. Se conservan cliente, endpoint y contrato
existentes. Una actualización no cambia el audio activo ni la selección. Ante
errores, datos inválidos o respuesta vacía no se sustituye una biblioteca válida
por una lista vacía. No se pausa por bloquear la pantalla.

La caché pasa a v12-navegacion-accesible para distribuir el nuevo módulo
library.js y los recursos actualizados. Se preservan manifiesto, iconos y /app/.
No se guardan MP3 mediante el service worker. No se modifica infraestructura.

## Pruebas focalizadas

```powershell
node --test --test-name-pattern="paginación|audios:|Catechism question order|catechism traversal|catechism first|catalog refresh retains keyboard" app/tests/navigation.test.cjs
node --test --test-name-pattern="opening and every sermon selection" app/tests/audio-release.test.cjs
```

El ajuste a grupos de cinco se verificó con 24 pruebas focalizadas, incluyendo
1, 5, 6, 12 y 35 grabaciones en las tres categorías, grupos parciales, extremos,
límites de índice y conservación del audio activo al recorrer grupos.
Los casos son ficticios y existen solo en las pruebas.
Comprueban primer/último mensaje, grupos e intermedio, continuidad, una sola
reproducción, ausencia de precarga, publicación durante reproducción, recuperación
del catálogo, orden del Catecismo, contenido externo como texto y foco de teclado.

Revisión local: reproducción real del último sermón y de mensajes históricos,
pausa/continuar, selección por intervalos, anchos de 320, 390 y 1280 píxeles,
controles superiores a 48 px y ausencia de desplazamiento horizontal. Se comprobó
texto al 200% mediante una copia temporal con fuente raíz de 40 px, sin cambiar
la fuente de producción de 20 px. Esa copia no se incluye en Git.

El navegador local conservó el respaldo válido cuando falló la consulta del
catálogo automático; el servicio público respondió HTTP 200 y su respuesta fue
validada con el consumidor existente. No se cambiaron CORS ni el contrato.

Pendiente en dispositivos físicos: TalkBack/VoiceOver, ampliación configurada por
el usuario y continuidad con pantalla apagada. La revisión local no sustituye
esas pruebas. No se despliega ni fusiona sin autorización del responsable.
