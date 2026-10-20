# Biblioteca pública

La web reutiliza `IBCPublicCatalog` y su único endpoint aprobado. `biblioteca-series.js` agrupa por categoría y título de serie, con número entero positivo, y `catalogo-web.js` actualiza la interfaz al abrir, cada cinco minutos con la página visible y al recuperar conexión. No hay un segundo catálogo ni cambios en `/app/`.

Los 12 Colosenses de `script.js` siguen como respaldo, sin identificadores administrativos inventados. Se reutiliza el HTML inicial. Un registro publicado reemplaza visualmente al histórico solo si coincide la URL, o categoría/serie/número/título/pasaje completos. No se infieren equivalencias por títulos parecidos. Efesios y los dos destacados siguen intactos.

Las series nuevas aparecen al publicar sus metadatos en el catálogo. Taller bíblico y Catecismo y confesión se muestran por separado en Escuela Dominical. Cada serie tiene un selector nativo y un video con `preload="none"`, sin autoplay; MP3 opcional. Cambiar de selección pausa el contenido anterior. Publicaciones recientes conserva todos los registros y permite abrir los anteriores después de los tres primeros. Fechas de calendario se presentan sin conversiones de zona horaria.

## Asociación editorial aprobada el 19 de octubre de 2026

El contenido ID público `1`, «Introducción a las Teologías Reformadas», ya fue asociado y aprobado mediante el flujo de corrección de IBC Admin: categoría `taller_biblico`, `serie.titulo: "Teología Reformada"` y `numero_mensaje: 1`. El catálogo público v1 entrega estos metadatos en su revisión `2`; la biblioteca lo incorpora automáticamente a Escuela Dominical y lo conserva en Publicaciones recientes.

La corrección conservó el ID, título, predicador, `publicado_en`, demás metadatos y enlaces/versiones MP4 y MP3 originales. La fecha de grabación y el pasaje siguen en `null`; se muestra «Fecha desconocida». No se duplicó ni se volvió a subir la grabación. El lector público y el panel ya admiten series escolares; no queda pendiente esa mejora administrativa. Las otras siete clases de referencia no se muestran porque no constan como publicaciones aprobadas.

Ante error remoto permanecen el archivo histórico y, si existe, el último catálogo validado por el cliente compartido, señalado como desactualizado. Una respuesta válida nueva elimina las publicaciones retiradas de la interfaz. No modifica archivos multimedia ni datos administrativos.

## Revisión antes de publicar

Ejecutar `node --test tests/public-site.test.mjs tests/biblioteca-series.test.cjs`, `node scripts/generar-sermones.mjs --check`, las comprobaciones `node --check` de los tres JS modificados y `git diff --check`. Servir la carpeta por HTTP y revisar `sermones.html` e `index.html` en escritorio y móvil: selector, reproducción, MP3, anteriores y navegación. El generador sigue siendo solo el respaldo histórico; no hace falta ejecutarlo por cada publicación del catálogo.

La autorización C permite fusionar el PR #14 y publicar mediante GitHub Pages después de esta actualización documental. La fusión debe respetar las protecciones normales del repositorio; no se despliega directamente desde la rama de trabajo.

Escuela Dominical muestra únicamente categorías que ya contienen series publicadas. Las categorías vacías no agregan títulos ni avisos; si todavía no hay ninguna serie escolar clasificada, queda un único enlace a Publicaciones recientes. Verificado en navegador local con categorías pobladas y después del retiro del catálogo de prueba.

Validación de esta implementación: 14 pruebas automatizadas aprobadas; sintaxis, sincronización y diff sin errores. En navegador local se comprobaron escritorio de 1280 px, móviles de 320 y 390 px sin desbordamiento, reproducción real de Colosenses 12 y del MP3 publicado, teclado, menú, Facebook, WhatsApp y recientes en inicio. Un catálogo de prueba aislado verificó nuevas series, mensaje 13, anteriores y retiros; la caída simulada del catálogo conservó los doce históricos seleccionables. El endpoint restringe CORS al dominio público: la vista local usó un proxy de lectura de su respuesta real, sin cambiar CORS ni configuración de producción. No se modificaron código compartido del catálogo ni archivos de la PWA.
