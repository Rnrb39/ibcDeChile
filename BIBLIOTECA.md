# Biblioteca pública

La web reutiliza `IBCPublicCatalog` y su único endpoint aprobado. `biblioteca-series.js` agrupa por categoría y título de serie, y `catalogo-web.js` actualiza la interfaz al abrir, cada cinco minutos con la página visible y al recuperar conexión. Predicaciones y Taller bíblico conservan el número entero positivo obligatorio; Catecismo y confesión admite explícitamente `numero_mensaje: null`. No hay un segundo catálogo.

Los 12 Colosenses de `script.js` siguen como respaldo, sin identificadores administrativos inventados. Se reutiliza el HTML inicial. Un registro publicado reemplaza visualmente al histórico solo si coincide la URL, o categoría/serie/número/título/pasaje completos. No se infieren equivalencias por títulos parecidos. Efesios y los dos destacados siguen intactos.

Las series nuevas aparecen al publicar sus metadatos en el catálogo. Taller bíblico y Catecismo y confesión se muestran por separado en Escuela Dominical. Cada serie tiene un selector nativo y un video con `preload="none"`, sin autoplay; MP3 opcional. Cambiar de selección pausa el contenido anterior. Publicaciones recientes conserva todos los registros y permite abrir los anteriores después de los tres primeros. Fechas de calendario se presentan sin conversiones de zona horaria.

## Asociación editorial aprobada el 19 de octubre de 2026

El contenido ID público `1`, «Introducción a las Teologías Reformadas», ya fue asociado y aprobado mediante el flujo de corrección de IBC Admin: categoría `taller_biblico`, `serie.titulo: "Teología Reformada"` y `numero_mensaje: 1`. El catálogo público v1 entrega estos metadatos en su revisión `2`; la biblioteca lo incorpora automáticamente a Escuela Dominical y lo conserva en Publicaciones recientes.

La corrección conservó el ID, título, predicador, `publicado_en`, demás metadatos y enlaces/versiones MP4 y MP3 originales. La fecha de grabación y el pasaje siguen en `null`; se muestra «Fecha desconocida». No se duplicó ni se volvió a subir la grabación. El lector público y el panel ya admiten series escolares; no queda pendiente esa mejora administrativa. Las otras siete clases de referencia no se muestran porque no constan como publicaciones aprobadas.

Ante error remoto permanecen el archivo histórico y, si existe, el último catálogo validado por el cliente compartido, señalado como desactualizado. Una respuesta válida nueva elimina las publicaciones retiradas de la interfaz. No modifica archivos multimedia ni datos administrativos.

## Revisión antes de publicar

Ejecutar `node --test tests/public-site.test.mjs tests/biblioteca-series.test.cjs`, `node scripts/generar-sermones.mjs --check`, las comprobaciones `node --check` de los tres JS modificados y `git diff --check`. Servir la carpeta por HTTP y revisar `sermones.html` e `index.html` en escritorio y móvil: selector, reproducción, MP3, anteriores y navegación. El generador sigue siendo solo el respaldo histórico; no hace falta ejecutarlo por cada publicación del catálogo.

La autorización C correspondió al PR #14, ya publicado. No autoriza publicar la ampliación siguiente.

Escuela Dominical muestra únicamente categorías que ya contienen series publicadas. Las categorías vacías no agregan títulos ni avisos; si todavía no hay ninguna serie escolar clasificada, queda un único enlace a Publicaciones recientes. Verificado en navegador local con categorías pobladas y después del retiro del catálogo de prueba.

Validación de esta implementación: 14 pruebas automatizadas aprobadas; sintaxis, sincronización y diff sin errores. En navegador local se comprobaron escritorio de 1280 px, móviles de 320 y 390 px sin desbordamiento, reproducción real de Colosenses 12 y del MP3 publicado, teclado, menú, Facebook, WhatsApp y recientes en inicio. Un catálogo de prueba aislado verificó nuevas series, mensaje 13, anteriores y retiros; la caída simulada del catálogo conservó los doce históricos seleccionables. El endpoint restringe CORS al dominio público: la vista local usó un proxy de lectura de su respuesta real, sin cambiar CORS ni configuración de producción. No se modificaron código compartido del catálogo ni archivos de la PWA.

## Ampliación local: colección doctrinal y diseño adaptable

Preparada el 20 de octubre de 2026, sin publicar. Las tarjetas mantienen columnas de ancho comparable aunque solo haya una serie; Efesios comparte la cuadrícula. En escritorio, el marco del video no supera 300 px de alto; el video vertical usa `object-fit: contain` y conserva pantalla completa. En móvil se mantiene una columna.

La colección editorial prevista se llama **Estudio del Catecismo y la Confesión Bautista**, categoría `catecismo_confesion`. No se crean registros reales desde la web ni se generan sesiones históricas. Cada grabación puede pertenecer a esa serie con número null. Las opciones muestran su título, sin «Clase null» ni una numeración inferida. Se ordenan por fecha confirmada descendente; las fechas desconocidas van después y se desempatan por ID público ascendente. No se deduce una fecha de publicación.

Las preguntas, capítulos y párrafos se escriben en el título o la descripción aprobados; nunca sustituyen al número editorial. La descripción se presenta como texto, dentro de «Descripción y referencias». Opcionalmente, cada línea `MM:SS — Título` o `HH:MM:SS — Título` crea un botón de navegación: pausa el reproductor y busca ese instante sin autoplay. Solo deben introducirse tiempos comprobados en la grabación. El ejemplo de pregunta 84 y capítulo 26, párrafo 15, alrededor de 06:44, no fue verificado ni incorporado como contenido.

El contrato permanece en v1. El lector compartido transmite también la descripción; la PWA ya tolera número null y conserva reproducción/continuidad. Su único cambio funcional de distribución es renovar la versión de caché para recibir el lector compartido. No se añaden pantallas, filtros o estructuras doctrinales a la PWA.

### Instalación posterior, con autorización nueva

1. Instalar primero el lector público de IBC Admin (`catalog-worker.js`, consumido por su entrada de producción). El validador anterior rechaza una serie con número null y puede devolver 503 para todo el catálogo. Verificar que el catálogo vigente siga intacto.
2. Publicar la web y la actualización de caché de la PWA mediante el procedimiento normal del repositorio. Comprobar el catálogo vigente y la biblioteca antes de habilitar nuevos productores.
3. Actualizar el Worker/panel de IBC Admin, conservando secretos, permisos y configuración existentes. No requiere migración ni cambios de R2.
4. Desde Admin crear o reutilizar la colección, cargar metadatos comprobados y aprobar expresamente cada publicación. No modificar registros anteriores por inferencia. La colección aparecerá automáticamente cuando exista una grabación publicada.

Las comprobaciones específicas son `node --test tests/biblioteca-series.test.cjs app/tests/coleccion-sin-numero.test.cjs`; verifican la excepción limitada a esta categoría, orden, deduplicación, saltos sin autoplay y reproducción/continuidad de la PWA. Las vistas simuladas y sus capturas son locales; no forman parte del catálogo público.

Resultado de esta ampliación: 8 pruebas específicas y 4 regresiones seleccionadas aprobadas, sintaxis y `git diff --check` sin errores. HTML histórico sincronizado. Navegador: escritorio 1280 px y móviles 320/390 px sin desbordamiento; YouTube horizontal, MP4 vertical, pantalla completa, MP3, selección por teclado y salto pausado comprobados. PWA móvil: selección y reproducción real de MP3 con metadatos simulados, sin número inventado. Admin móvil: guardar/previsualizar/aprobar exclusivamente en una base efímera. Ninguna de estas pruebas creó publicaciones reales.
