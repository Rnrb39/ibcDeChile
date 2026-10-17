'use strict';

const IBCAudioCatalog = (() => {
  const base = typeof module !== 'undefined' && module.exports ? require('./catalog-utils.js') : IBCCatalog;
  const categories = ['predicaciones', 'catecismo-confesion', 'taller-biblico'];

  function isLocalPreview(hostname) {
    if (['localhost','127.0.0.1','[::1]','::1'].includes(hostname)) return true;
    const parts = hostname.split('.').map(Number);
    return parts.length === 4 && parts.every(part=>Number.isInteger(part) && part>=0 && part<=255) &&
      (parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1]>=16 && parts[1]<=31));
  }

  function resolveAudioUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value);
      if (url.username || url.password) return null;
      // Public catalog sources are explicit HTTPS URLs, never inferred from MP4 names.
      return /^https:\/\//i.test(value) && url.protocol === 'https:' && /\.mp3$/i.test(url.pathname) && !isLocalPreview(url.hostname) ? url.href : null;
    } catch { return null; }
  }

  function validRecording(item) {
    return item && categories.includes(item.category) &&
      ['id','title'].every(key=>typeof item[key]==='string' && item[key].trim()) &&
      ['series','speaker','passage','transcriptText'].every(key=>item[key]==null || typeof item[key]==='string') &&
      (item.number==null || (Number.isInteger(item.number) && item.number>0));
  }

  function hasAudio(item) {
    return Boolean(item && item.audioUrl && typeof item.audioVersion==='string' && item.audioVersion.trim());
  }

  function prepare(catalog) {
    if (catalog.version !== 1 || !Array.isArray(catalog.sermons)) throw new Error('Invalid catalog');
    const seen = new Set();
    return catalog.sermons.filter(validRecording).map(item=>{
      if (seen.has(item.id)) throw new Error('Duplicate recording ID');
      seen.add(item.id);
      const audioUrl = resolveAudioUrl(item.audioUrl);
      const audioVersion = typeof item.audioVersion==='string' && item.audioVersion.trim() ? item.audioVersion : null;
      return {...item,audioUrl:audioUrl && audioVersion ? audioUrl : null,audioVersion,
        audioDurationSeconds:Number.isFinite(item.audioDurationSeconds) && item.audioDurationSeconds>0 ? item.audioDurationSeconds : null};
    });
  }

  return {...base,validRecording,hasAudio,prepare,isLocalPreview,resolveAudioUrl};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IBCAudioCatalog;
