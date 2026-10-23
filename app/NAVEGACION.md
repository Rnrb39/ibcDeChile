# Interfaz accesible de la PWA de audio

## Vistas y navegación

- Inicio: logotipo auténtico, IBC de Chile, Juntos en la Palabra y tres accesos
  directos a Predicaciones, Catecismo y Confesión y Taller Bíblico.
- Biblioteca: una única serie abre directamente sus grabaciones. Varias series
  comparten el selector paginado. Se muestran tres opciones por página, con
  Anterior, Siguiente y un botón para volver. No se recortan los títulos.
- Reproductor: título real, pasaje si existe, posición y duración. Tres botones
  en una fila: −15, reproducción/pausa central y +15. El control central usa el
  símbolo habitual y una etiqueta visible y accesible Reproducir/Pausar; así
  la ampliación del texto no comprime una palabra dentro del botón.
- El predicador y la fecha se muestran bajo el título y el pasaje, en líneas
  separadas. Una fecha desconocida se indica como Fecha por confirmar.
  Más opciones conserva la serie, controles nativos y recorrido entre mensajes.
  La continuidad ofrece continuar o empezar desde el principio.
- Volver, cambiar de vista y paginar no pausan ni sustituyen audio. Seleccionar
  una grabación guarda el avance saliente y espera una acción para reproducir.
- El botón Atrás del teléfono recupera las vistas. El foco se mueve al título de
  la nueva vista. La carga inicial no cambia una categoría ya abierta.

`views.js` gestiona solamente vistas, listas y foco. `app.js` conserva el único
reproductor, las consultas al catálogo y los eventos de progreso. Se reutilizan
`library.js`, `audio-catalog.js` y `playback-progress.js`. No hay dependencias nuevas.

El aviso de fallo del catálogo es temporal (12 segundos) y tiene Cerrar. No
desaparece mientras Cerrar conserva el foco. El último resultado se consulta en
Estado del catálogo desde Inicio, con anuncio accesible separado del aviso.
Cerrar no recarga ni modifica la navegación, el catálogo o el audio. El mismo
fallo no vuelve a anunciarse hasta recuperarse o realizar un reintento explícito.
Al volver la conexión se programa un único reintento, respetando el mínimo de
30 segundos entre consultas. Un fallo de actualización no declara que el
dispositivo esté sin internet; esa indicación usa el estado de conexión del
navegador. Los errores sin catálogo disponible conservan un estado visible en
la biblioteca, además del historial accesible en Inicio.

## Identidad e información

Colores tomados de `main.css` de la web: azul #1b2a4a, dorado #c5a059, fondo
#f9f9fb y texto #25282d. El dorado es decorativo, no se usa para texto pequeño.
El fondo es una variación tonal suave sin fotografías ni texturas. El reproductor
usa una tarjeta clara, bordes suaves y sombra discreta; los accesos para volver
conservan flecha, texto y un área táctil de al menos 48 px.
La tipografía de lectura usa fuentes del dispositivo, con títulos en Georgia,
sin descargar fuentes externas. `assets/logo.jpeg` es una copia idéntica del
logotipo original de la iglesia. No se modifica el original.

Se conservan catálogo, IDs, MP3, fechas, pasajes, títulos y clasificaciones.
Las listas conservan el orden editorial de las series. El catecismo conserva su
lista descendente y el recorrido lógico ascendente entre preguntas existentes.
Los títulos externos se insertan con textContent, nunca como HTML.

## Continuidad e instalación

No hay fuente multimedia al abrir ni al seleccionar. Solo una acción explícita
carga el MP3. Se conservan las reglas de progreso: 30 segundos significativos,
últimos 30 segundos como final, invalidación por versión y caducidad a 90 días.
Ocultar la página guarda el avance y nunca pausa el audio.

La identidad del manifiesto (id, start_url, scope, nombre e iconos) no cambia.
Solo cambian los colores de presentación. La caché v13-vistas-accesibles incluye
el módulo de vistas y la copia del logotipo. La estrategia de actualización y
activación por botón se conserva; no se cachean MP3 ni se intercepta la web.

## Verificación local

Pruebas focalizadas: navegación y categorías, carga diferida, foco, selección sin
reproducción, barra de posición, progreso, catálogo válido y fallos, instalación
y actualización. Se conservan las pruebas de metadatos confirmados y de ausencia
de dependencias del prototipo de audio o de archivos locales.

Revisión de navegador: 320 × 568, 390 × 700 y tablet. Se permite desplazamiento
vertical con títulos largos, avisos, opciones de continuidad o texto ampliado.
La comprobación de texto al 200% usa una copia temporal con raíz de 40 px; no
sustituye la ampliación real del sistema operativo ni las pruebas con lectores
de pantalla. No se cambia el tamaño de fuente de producción de 20 px.

El catálogo público permite CORS únicamente desde https://ibcdechile.org.
Desde localhost se conserva el catálogo incluido y se muestra aviso al fallar
la actualización pública. No se cambia esta política ni la configuración
compartida. Las categorías de Escuela Dominical se prueban automáticamente con
fixtures, sin añadir datos ficticios al catálogo público.

Pendiente en dispositivos: Samsung S25 FE y Galaxy A10s, pantalla apagada,
segundo plano, TalkBack/VoiceOver, ampliación nativa e instalación/actualización
real por HTTPS. Las pruebas simuladas no garantizan el comportamiento de cada
sistema operativo. No se publica esta rama sin autorización.
