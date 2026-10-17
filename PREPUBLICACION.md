# Revisión de compatibilidad antes de publicar

Fecha: 17 de octubre de 2026. Rama local: `codex/estabilidad-visual-publica`.

**Resultado actualizado: apta para una entrega independiente de correcciones CLS del sitio estático actual, sin regresiones detectadas en el alcance comprobado. La integración automática del catálogo queda fuera de esta publicación por decisión del usuario. No se ha publicado, fusionado ni desplegado.**

## Alcance aprobado para esta candidata

La corrección visual y la integración automática son entregas separadas. La ausencia del catálogo dinámico no bloquea esta mejora del sitio que ya funciona con datos estáticos. La incompatibilidad indicada en la revisión anterior afectaba a presentar el generador como solución definitiva para altas automáticas, no a publicar la corrección de CLS por sí sola.

Se descargaron para comparación de solo lectura los archivos actualmente publicados `script.js`, `main.css`, `sermones.html` y `galeria.html`. Los cuatro coinciden con sus versiones base en HEAD, normalizando únicamente los finales de línea. La candidata conserva exactamente los registros de los once mensajes, la serie de Efesios y los dos destacados. Las pruebas comparan esos datos y la lógica de Facebook, menú y visor contra la base publicada `cd4aa5b`.

La paginación es la única diferencia de interacción prevista respecto de la galería publicada: sustituye la lista continua por grupos de doce, según la corrección visual ya revisada. No descarta fotos, altera sus URLs ni reduce el conjunto disponible en el JSON. Si se exigiera conservar también el desplazamiento continuo de las treinta fotos, habría que cambiar esta solución; ese no es el alcance visual ya aprobado.

El HTML generado es una instantánea inicial y respaldo temporal. No introduce service worker, persistencia ni caché de catálogo. Las condiciones que evitan reinsertar las tarjetas actúan únicamente durante la inicialización actual: un futuro adaptador podrá reemplazar o reconciliar los datos y el DOM. Al implementar esa integración se cambiará esa ruta de inicialización una vez, manteniendo la reserva visual; el generador no deberá ejecutarse por cada nueva predicación del catálogo. No se ha implementado ningún adaptador provisional ni se ha cambiado la PWA.

Hasta entonces, actualizar el contenido del sitio estático seguirá requiriendo su publicación habitual y ejecutar el generador para sincronizar el respaldo. Es un requisito temporal documentado, no una capacidad de altas automáticas ya entregada.

## Limitación del flujo estático, fuera del alcance de CLS

El flujo actual es `datos en script.js → generar-sermones.mjs → sermones.html → Git/publicación`. La inicialización de la web conserva las tarjetas que encuentra en el HTML. No consulta ningún catálogo público y no actualiza ese HTML con datos recibidos del panel.

Por tanto, hoy agregar una predicación exige cambiar `script.js`, ejecutar el generador e incluir los archivos resultantes en una publicación. No exige editar manualmente el HTML, pero sí requiere cambios en el repositorio por cada actualización. Esto incumple el requisito de altas automáticas sin commits si se usa como arquitectura definitiva.

El problema no es que el generador impida técnicamente una integración posterior: sus funciones se pueden reutilizar. Es convertirlo en un paso obligatorio para cada alta y mantener los datos editoriales dentro de JavaScript. Las correcciones de CLS pueden conservarse al reemplazar esa vía.

## Contrato e integración pendientes

Los documentos existentes `app/README.md` y `app/RELEASE-AUDIO.md` indican que el adaptador administrativo aún está pendiente. La candidata PWA lee `app/catalog.json`. Ese catálogo actual contiene audio y revisiones de audio; no debe suponerse que contiene las URLs de video para la web. Tampoco se debe deducir una URL de video a partir de un MP3.

Para cumplir `ibc-admin → R2 y catálogo público → Web y PWA`:

1. Acordar una URL pública de solo lectura y su contrato versionado. Los registros deben tener ID estable, publicación, título, serie, orden, pasaje, predicador y fecha/indicación de estimación. Las URLs de video y audio y sus revisiones deben ser explícitas; cada cliente usa los medios disponibles que necesita.
2. La web debe consultar ese catálogo en ejecución y reconciliar sus selectores y tarjetas por ID. Las altas deben aparecer al recargar/actualizar los datos, sin regenerar HTML ni hacer commits. Mantener la selección y no interrumpir o iniciar automáticamente una reproducción al actualizar.
3. Usar el HTML generado solo como instantánea inicial y respaldo ante falta de red, no como fuente definitiva ni como puerta que impida actualizar el DOM. Conservar espacio estable en las tarjetas y en los reproductores para no reintroducir CLS.
4. Acordar publicación/caché y CORS si corresponde. La PWA necesitará su propio adaptador y estrategia de actualización de catálogo; no se cambió `/app/` en esta entrega. Los borradores y credenciales administrativas no deben llegar a los clientes públicos.
5. Añadir una prueba que simule un registro nuevo en el catálogo y confirme que aparece sin cambiar los archivos del sitio. Los siete tests actuales comprueban el comportamiento actual; no prueban esa integración todavía inexistente.

No se ha inventado una URL administrativa, conectado un servicio, cambiado R2 ni usado D1. La revisión no debe confundirse con una integración ya implementada.

## Acceso a las fotografías

- El paginador consume todas las entradas de `data/fotos.json`; no hace un `slice` global que descarte las posteriores a la primera página.
- Con las 30 fotos actuales se recorren 1–12, 13–24 y 25–30. Las pruebas verifican las URLs y el orden exactos de todas las fotos, también al volver atrás.
- Pasan casos de 1, 12, 13, 24, 25, 30, 31, 60 y 61 fotografías, sin omisiones ni duplicaciones y con doce celdas reservadas por página.
- El botón Siguiente solo se deshabilita al alcanzar el total; Anterior permite volver a la primera página. El visor sigue abriendo la foto original, no la miniatura.
- **Alcance:** todas las fotos del JSON están accesibles. La automatización existente pide a Facebook como máximo 30 fotos (`limit: '30'`) y no recorre el historial completo de Facebook. Cambiar ese alcance sería otro trabajo; aquí se conserva la automatización.

## Preparación y verificación local

Se actualizó `origin/main` mediante fetch de solo lectura. Su revisión observada es `a34bc2a`, que ya incorpora el commit previo de audio PWA `cd4aa5b`. Los árboles de HEAD y esa revisión no difieren: los cambios locales de esta tarea son independientes del trabajo anterior. No se realizó merge ni rebase, y se conservaron todos los cambios locales.

Archivos candidatos de la corrección CLS:

- `galeria.html`, `sermones.html`, `main.css`, `script.js`.
- `scripts/generar-sermones.mjs`, `scripts/cls-preview.mjs`.
- `tests/public-site.test.mjs`, `REVISION-CLS.md`, este informe.

Comprobaciones de esta revisión:

```powershell
node --test tests/public-site.test.mjs
node scripts/generar-sermones.mjs --check
node --check script.js
git diff --check
git diff --exit-code -- app data scripts/actualizar-facebook.mjs .github/workflows
```

Nueve pruebas aprobadas. Los archivos protegidos, datos y automatizaciones no tienen cambios. Las pruebas de navegador de CLS y funcionamiento siguen documentadas en `REVISION-CLS.md`. En esta revisión no se cambió la interacción de las páginas aprobadas visualmente; se añadieron comparaciones de regresión y se precisó el alcance de la entrega.

**Decisión de publicación:** candidata preparada como mejora visual transitoria del sitio estático. La publicación de este alcance cuenta con autorización del usuario, condicionada a repetir las verificaciones, preservar main y superar los controles normales del Pull Request y GitHub Pages. La integración automática no forma parte de la entrega y conserva sus requisitos futuros descritos arriba.
