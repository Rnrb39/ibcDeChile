'use strict';

// Shared by the interface and local tests. Dates are calendar dates, not timestamps.
const IBCCatalog = (() => {
  const categories = ['predicaciones', 'catecismo-confesion', 'taller-biblico'];

  function confirmedDate(item) {
    if (item.dateEstimated || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return null;
    const [year, month, day] = item.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? item.date : null;
  }

  function formatDate(item) {
    const confirmed = confirmedDate(item);
    if (!confirmed) return 'Fecha por confirmar';
    const [year, month, day] = confirmed.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function safeUrl(value) {
    if (typeof value !== 'string') return false;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }

  function validRecording(item) {
    return item && categories.includes(item.category) &&
      ['id', 'title'].every(key => typeof item[key] === 'string' && item[key].trim()) &&
      ['series', 'speaker', 'passage', 'transcriptText'].every(key => item[key] == null || typeof item[key] === 'string') &&
      (item.number == null || (Number.isInteger(item.number) && item.number > 0)) &&
      safeUrl(item.videoUrl) && (!item.captionsUrl || safeUrl(item.captionsUrl));
  }

  function orderRecordings(items) {
    return [...items].sort((a, b) => {
      const aDate = confirmedDate(a);
      const bDate = confirmedDate(b);
      if (aDate && bDate) return bDate.localeCompare(aDate) || (b.number || 0) - (a.number || 0);
      if (aDate || bDate) return aDate ? -1 : 1;
      // An unknown date must never be used to claim a recording is the latest.
      return a.series === b.series ? (b.number || 0) - (a.number || 0) : 0;
    });
  }

  return { confirmedDate, formatDate, validRecording, orderRecordings };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IBCCatalog;
