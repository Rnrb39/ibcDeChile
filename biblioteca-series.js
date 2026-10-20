'use strict';
// Organización de la interfaz. La única fuente remota sigue siendo IBCPublicCatalog.
const IBCBiblioteca = (() => {
    const categories = { predicaciones: 'Predicación', 'taller-biblico': 'Taller bíblico', 'catecismo-confesion': 'Catecismo y confesión' };
    const text = value => typeof value === 'string' ? value.trim() : '';
    const numbered = item => Number.isInteger(item.number) && item.number > 0;
    const numberOptional = item => item.category === 'catecismo-confesion' && item.number === null;
    const classified = item => !!categories[item.category] && !!text(item.series) && (numbered(item) || numberOptional(item));
    const groupKey = item => JSON.stringify([item.category, text(item.series)]);
    const itemKey = item => item.id || item.videoUrl;
    const numberLabel = item => numbered(item) ? `${item.category === 'predicaciones' ? 'Mensaje' : item.category === 'catecismo-confesion' ? 'Grabación' : 'Clase'} ${item.number}` : '';
    const optionLabel = item => `${numbered(item) ? item.number + '. ' : ''}${item.title}`;

    function collectionOrder(a, b) {
        const day = item => !item.dateEstimated && dateLabel(item) !== 'Fecha desconocida' ? item.date : '';
        const dates = day(b).localeCompare(day(a));
        if (dates) return dates;
        const left = String(a.publicId || itemKey(a)), right = String(b.publicId || itemKey(b));
        return /^\d+$/.test(left) && /^\d+$/.test(right) ? left.length - right.length || left.localeCompare(right) : left.localeCompare(right, 'es');
    }

    // Solo marcas explícitas en la descripción editorial; no se infieren temas ni tiempos.
    function chapters(description) {
        const result = [], seen = new Set();
        for (const line of text(description).split(/\r?\n/)) {
            const m = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)\s+[—–-]\s+(.{1,180})$/.exec(line.trim());
            if (!m || m[1] && Number(m[2]) > 59) continue;
            const seconds = Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
            if (seen.has(seconds)) continue;
            seen.add(seconds); result.push({ seconds, label: line.trim() });
            if (result.length === 20) break;
        }
        return result;
    }

    function dateLabel(item) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.date || '');
        if (!match) return 'Fecha desconocida';
        const [, y, m, d] = match.map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return 'Fecha desconocida';
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${d} de ${months[m - 1]} de ${y}${item.dateEstimated ? ' · Fecha estimada' : ''}`;
    }

    function recent(items) {
        const seenIds = new Set(), seenUrls = new Set();
        return [...items].filter(item => {
            if (seenIds.has(itemKey(item)) || seenUrls.has(item.videoUrl)) return false;
            seenIds.add(itemKey(item)); seenUrls.add(item.videoUrl); return true;
        }).sort((a, b) => {
            const aDate = !a.dateEstimated && dateLabel(a) !== 'Fecha desconocida' ? a.date : '';
            const bDate = !b.dateEstimated && dateLabel(b) !== 'Fecha desconocida' ? b.date : '';
            // Sin fecha confirmada, conservar el orden del catálogo, no inventar antigüedad.
            return bDate.localeCompare(aDate);
        });
    }

    // Solo coincidencias exactas: URL, o categoría/serie/número/título/pasaje.
    // Es una deduplicación visual; no asigna IDs administrativos a los históricos.
    function sameRecording(a, b) {
        return a.videoUrl === b.videoUrl || classified(a) && classified(b) && numbered(a) && numbered(b) && groupKey(a) === groupKey(b) &&
            a.number === b.number && text(a.title) === text(b.title) &&
            !!text(a.passage) && text(a.passage) === text(b.passage);
    }

    function organize(historical, live) {
        const published = recent(live);
        const assigned = published.filter(classified);
        const items = [...assigned, ...historical.filter(old => !assigned.some(item => sameRecording(old, item)))];
        const groups = new Map();
        for (const item of items) {
            if (!classified(item)) continue;
            const key = groupKey(item);
            if (!groups.has(key)) groups.set(key, { key, category: item.category, title: text(item.series), items: [] });
            const list = groups.get(key).items;
            if (!list.some(other => sameRecording(other, item))) list.push(item);
        }
        for (const group of groups.values()) group.items.sort(group.category === 'catecismo-confesion' ? collectionOrder : (a, b) => a.number - b.number || a.title.localeCompare(b.title, 'es'));
        return { groups: [...groups.values()], pending: published.filter(item => !classified(item)).map(item => ({
            publicId: item.publicId, title: item.title,
            missing: [!text(item.series) && 'serie', !numbered(item) && !numberOptional(item) && 'numero_mensaje'].filter(Boolean)
        })) };
    }

    function pauseOthers(media) {
        document.querySelectorAll('video, audio').forEach(other => { if (other !== media) other.pause(); });
    }

    function seriesCard(card, group, hydrated = false) {
        const create = (tag, className) => { const node = document.createElement(tag); if (className) node.className = className; return node; };
        let count, heading, selector, detail, video, link;
        if (hydrated) {
            count = card.querySelector('.sermon-serie'); heading = card.querySelector('h3');
            selector = card.querySelector('select'); detail = card.querySelector('.detalle-mensaje');
            video = card.querySelector('video'); link = card.querySelector('#enlaceColosenses');
        } else {
            card.className = 'sermon-tarjeta'; count = create('p', 'sermon-serie'); heading = create('h3', 'titulo-sermon-tarjeta');
            const label = create('label', 'selector-mensaje-label'); label.textContent = group.category === 'catecismo-confesion' ? 'Seleccionar grabación' : 'Seleccionar mensaje o clase';
            selector = create('select', 'selector-mensaje'); label.append(selector);
            detail = create('div', 'detalle-mensaje'); detail.setAttribute('aria-live', 'polite'); detail.setAttribute('aria-atomic', 'true');
            const frame = create('div', 'video-responsive sermon-video'); video = create('video');
            video.controls = true; video.playsInline = true; video.preload = 'none'; frame.append(video);
            link = create('a', 'btn-principal'); link.textContent = 'Abrir video ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer';
            card.append(count, heading, label, detail, frame, link);
        }
        const audioArea = create('div', 'serie-audio'); audioArea.hidden = true;
        const audioLabel = create('p'); audioLabel.textContent = 'Escuchar audio MP3';
        const audio = create('audio'); audio.controls = true; audio.preload = 'none';
        audioArea.append(audioLabel, audio); card.append(audioArea);
        video.addEventListener('play', () => pauseOthers(video)); audio.addEventListener('play', () => pauseOthers(audio));
        let items = [], selected = hydrated ? group.items.find(i => String(i.number) === selector.value || itemKey(i) === selector.value) || group.items[0] : null, signature = '', pendingSeek = null;
        const seek = () => {
            if (pendingSeek === null || video.readyState < 1) return;
            if (Number.isFinite(video.duration) && pendingSeek < video.duration) video.currentTime = pendingSeek;
            pendingSeek = null;
        };
        video.addEventListener('loadedmetadata', seek);
        const setMedia = (media, url, revision, force) => {
            if (media.getAttribute('src') === (url || '') && media.dataset.revision === (revision || '') && !force) return;
            // El video histórico tiene un source HTML; no se recarga si es el mismo.
            const source = media.querySelector('source');
            if (!force && source && source.getAttribute('src') === url && !media.dataset.revision && !revision) return;
            media.pause(); media.querySelectorAll('source').forEach(node => node.remove());
            if (url) media.src = url; else media.removeAttribute('src');
            media.dataset.revision = revision || ''; media.load();
        };
        const show = (item, userChange) => {
            pendingSeek = null; video.preload = 'none';
            if (userChange) { video.pause(); audio.pause(); }
            setMedia(video, item.videoUrl, item.videoVersion, userChange);
            setMedia(audio, item.audioUrl, item.audioVersion, userChange);
            video.setAttribute('aria-label', `${group.title}: ${item.title}`);
            audio.setAttribute('aria-label', `Audio: ${item.title}`);
            link.href = item.videoUrl; audioArea.hidden = !item.audioUrl;
            const fragment = document.createDocumentFragment();
            for (const [tag, value, cls] of [
                ['p', numberLabel(item), 'sermon-serie'],
                ['h4', item.title], ['p', item.passage, 'sermon-referencia'],
                ['p', item.speaker, 'sermon-predicador'], ['p', dateLabel(item), 'sermon-fecha']
            ]) if (value) { const node = create(tag, cls); node.textContent = value; fragment.append(node); }
            if (text(item.description)) {
                const description = create('details', 'descripcion-grabacion');
                const summary = create('summary'); summary.textContent = 'Descripción y referencias';
                const body = create('p'); body.textContent = item.description;
                description.append(summary, body); fragment.append(description);
            }
            const parts = chapters(item.description);
            if (parts.length) {
                const nav = create('div', 'partes-grabacion');
                const intro = create('p'); intro.textContent = 'Ir a una parte del video (queda en pausa):'; nav.append(intro);
                for (const part of parts) {
                    const button = create('button'); button.type = 'button'; button.textContent = part.label;
                    button.addEventListener('click', () => {
                        video.pause(); audio.pause(); pendingSeek = part.seconds;
                        if (video.readyState >= 1) seek();
                        else { video.preload = 'metadata'; video.load(); }
                    });
                    nav.append(button);
                }
                fragment.append(nav);
            }
            detail.replaceChildren(fragment); selected = item;
        };
        selector.addEventListener('change', () => { const item = items.find(i => itemKey(i) === selector.value); if (item) show(item, true); });
        const update = next => {
            group = next; items = next.items;
            const previous = selected;
            const item = items.find(i => previous && itemKey(i) === itemKey(previous)) ||
                items.find(i => previous && i.videoUrl === previous.videoUrl) || items[0];
            const noun = group.category === 'predicaciones' ? (items.length === 1 ? 'mensaje' : 'mensajes') : group.category === 'catecismo-confesion' ? (items.length === 1 ? 'grabación disponible' : 'grabaciones disponibles') : (items.length === 1 ? 'clase' : 'clases');
            count.textContent = `${items.length} ${noun}`; heading.textContent = group.title;
            const options = JSON.stringify(items.map(i => [itemKey(i), i.number, i.title]));
            if (options !== signature) {
                selector.replaceChildren(...items.map(i => { const o = create('option'); o.value = itemKey(i); o.textContent = optionLabel(i); return o; }));
                signature = options;
            }
            selector.value = itemKey(item);
            if (!previous || JSON.stringify(previous) !== JSON.stringify(item)) show(item, false);
        };
        update(group);
        return { update, remove() { video.pause(); audio.pause(); card.remove(); } };
    }

    return { categories, classified, groupKey, itemKey, dateLabel, numberLabel, optionLabel, collectionOrder, chapters, recent, sameRecording, organize, pauseOthers, seriesCard };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IBCBiblioteca;
else globalThis.IBCBiblioteca = IBCBiblioteca;
