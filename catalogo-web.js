'use strict';
(() => {
    let started = false;
    function start() {
        if (started || !globalThis.IBCPublicCatalogConfig?.enabled) return;
        started = true;
        const containers = [...document.querySelectorAll('[data-ibc-catalog]')];
        if (!containers.length) return;
        const library = globalThis.IBCBiblioteca;
        let storage;
        try { storage = localStorage; } catch { /* El catálogo funciona sin almacenamiento. */ }
        const client = IBCPublicCatalog.create({ storage });
        const cards = new Map();
        const historical = globalThis.IBCLegacyColosenses?.items || [];
        const seriesRoot = document.getElementById('seriesPredicacion');
        const status = document.getElementById('estadoBiblioteca');
        let updating = false;

        const node = (tag, text, className) => {
            const element = document.createElement(tag);
            if (text) element.textContent = text;
            if (className) element.className = className;
            return element;
        };

        function renderRecent(container, items, stale) {
            const playing = [...container.querySelectorAll('audio')].filter(audio => !audio.paused);
            const previousIds = JSON.parse(container.dataset.itemIds || '[]');
            // Una actualización idéntica no interrumpe audio; un retiro sí debe desaparecer.
            if (playing.length && previousIds.every(id => items.some(item => library.itemKey(item) === id)) && playing.every(audio => items.some(item =>
                library.itemKey(item) === audio.dataset.item && item.audioUrl === audio.getAttribute('src') &&
                (item.audioVersion || '') === audio.dataset.revision))) return;
            playing.forEach(audio => audio.pause());
            const signature = JSON.stringify([items, stale]);
            if (container.dataset.signature === signature) return;
            const fragment = document.createDocumentFragment();
            fragment.append(node('p', stale ? 'Mostramos el último catálogo disponible.' :
                items.length ? 'Contenidos publicados por IBC de Chile.' : 'Todavía no hay nuevas publicaciones. Puedes consultar el archivo histórico.'));
            fragment.firstChild.setAttribute('role', 'status');
            const older = node('details');
            older.append(node('summary', 'Ver publicaciones anteriores'));
            items.forEach((item, index) => {
                const article = node('article', '', 'sermon-tarjeta');
                const meta = [library.categories[item.category], item.series,
                    library.numberLabel(item),
                    item.speaker, library.dateLabel(item), item.passage].filter(Boolean).join(' · ');
                article.append(node('h3', item.title), node('p', meta));
                const video = node('a', 'Ver video MP4', 'btn-principal');
                video.href = item.videoUrl; video.target = '_blank'; video.rel = 'noopener noreferrer'; article.append(video);
                if (item.audioUrl) {
                    const audio = node('audio'); audio.controls = true; audio.preload = 'none'; audio.src = item.audioUrl;
                    audio.dataset.item = library.itemKey(item); audio.dataset.revision = item.audioVersion || '';
                    audio.setAttribute('aria-label', `Audio: ${item.title}`);
                    audio.addEventListener('play', () => library.pauseOthers(audio));
                    article.append(node('p', 'Escuchar audio MP3'), audio);
                }
                (index < 3 ? fragment : older).append(article);
            });
            if (items.length > 3) fragment.append(older);
            older.open = !!container.querySelector('details')?.open;
            container.replaceChildren(fragment); container.dataset.signature = signature;
            container.dataset.itemIds = JSON.stringify(items.map(library.itemKey));
        }

        function renderSeries(live, stale) {
            if (!seriesRoot) return;
            const { groups, pending } = library.organize(historical, live);
            const active = new Set();
            for (const group of groups) {
                const target = group.category === 'predicaciones' ? seriesRoot :
                    document.querySelector(`[data-ibc-series-category="${group.category}"]`);
                if (!target) continue;
                active.add(group.key);
                if (!cards.has(group.key)) {
                    const colosenses = group.category === 'predicaciones' && group.title === 'Colosenses' && document.getElementById('contenedorColosenses');
                    if (colosenses) globalThis.IBCLegacyColosenses.detach();
                    const card = colosenses || node('article');
                    if (!colosenses) target.insertBefore(card, target === seriesRoot ? document.getElementById('contenedorPlaylists') : null);
                    cards.set(group.key, library.seriesCard(card, group, !!colosenses));
                } else cards.get(group.key).update(group);
            }
            for (const [key, card] of cards) if (!active.has(key)) { card.remove(); cards.delete(key); }
            document.querySelectorAll('[data-ibc-category-section]').forEach(section => {
                section.hidden = !groups.some(group => group.category === section.dataset.ibcCategorySection);
            });
            const theology = document.getElementById('notaTeologia');
            if (theology) theology.hidden = groups.some(group => group.category !== 'predicaciones');
            if (status) status.textContent = stale ? 'Mostramos el último catálogo disponible. El archivo histórico sigue disponible.' : '';
            globalThis.IBCBibliotecaPending = pending;
        }

        // Conservar el respaldo y sus controles antes de recibir el catálogo remoto.
        renderSeries([], false);
        async function update() {
            if (updating) return;
            updating = true;
            try {
                const { catalog, stale } = await client.load();
                const items = library.recent(catalog.sermons);
                renderSeries(items, stale);
                for (const container of containers) renderRecent(container, items, stale);
            } catch {
                if (status) status.textContent = 'No se pudo consultar el catálogo. Puedes seguir usando el archivo histórico.';
                for (const container of containers) if (!container.childElementCount) {
                    const message = node('p', 'No se pudo consultar el catálogo nuevo. El archivo histórico sigue disponible.');
                    message.setAttribute('role', 'status'); container.append(message);
                }
            } finally { updating = false; }
        }
        update();
        setInterval(() => { if (document.visibilityState === 'visible') update(); }, 300000);
        window.addEventListener('online', update);
    }
    if (document.readyState === 'complete') start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
