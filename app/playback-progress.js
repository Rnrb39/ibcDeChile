'use strict';

const IBCPlaybackProgress = (() => {
  const KEY = 'ibc-pwa:last-playback:v1';
  const MIN_PROGRESS = 30;
  const END_MARGIN = 30;
  const MAX_AGE = 90 * 24 * 60 * 60 * 1000;

  function videoVersion(item) {
    // The existing catalog has immutable-looking URLs but no explicit media revision.
    // Prefer a future explicit revision; never invent a revision or an R2 object path.
    const revision = item.videoVersion;
    return typeof revision === 'string' && revision.trim() ? revision : `url:${item.videoUrl}`;
  }

  function valid(record, now) {
    if (!record || record.schemaVersion !== 1 || typeof record.id !== 'string' || !record.id.trim() || record.id.length > 200 ||
      typeof record.videoVersion !== 'string' || !record.videoVersion.trim() || record.videoVersion.length > 4096 ||
      !Number.isFinite(record.position) || record.position < 0 ||
      !Number.isFinite(record.duration) || record.duration <= 0 || record.position > record.duration ||
      typeof record.updatedAt !== 'string') return false;
    const timestamp = Date.parse(record.updatedAt);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === record.updatedAt &&
      timestamp <= now + 5 * 60 * 1000 && now - timestamp < MAX_AGE;
  }

  function finished(position, duration) {
    return Number.isFinite(duration) && duration > 0 && Number.isFinite(position) && duration - position <= END_MARGIN;
  }

  function resumable(record) {
    return record && record.position >= MIN_PROGRESS && !finished(record.position, record.duration);
  }

  function formatPosition(seconds) {
    const value = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }

  function createStore(getStorage, now = Date.now) {
    let memory = null;
    let failed = false;

    function clear() {
      memory = null;
      try { getStorage().removeItem(KEY); } catch { failed = true; }
    }

    function load() {
      try {
        const raw = getStorage().getItem(KEY);
        if (raw) {
          try { memory = raw.length <= 8192 ? JSON.parse(raw) : null; }
          catch { clear(); return null; }
        } else memory = null;
        if (raw && !valid(memory, now())) { clear(); return null; }
      } catch {
        failed = true;
      }
      if (memory && !valid(memory, now())) { clear(); return null; }
      return memory;
    }

    function save(item, position, duration) {
      if (!Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration <= 0 || position > duration) return false;
      if (finished(position, duration)) { clear(); return false; }
      const record = { schemaVersion: 1, id: item.id, position, duration, videoVersion: videoVersion(item), updatedAt: new Date(now()).toISOString() };
      if (!valid(record, now())) return false;
      memory = record;
      try { getStorage().setItem(KEY, JSON.stringify(record)); } catch { failed = true; }
      return true;
    }

    function clearFor(item) {
      const record = load();
      if (record?.id === item.id && record.videoVersion === videoVersion(item)) clear();
    }

    function find(recordings) {
      const record = load();
      if (!record) return null;
      const item = recordings.find(item => item.id === record.id);
      if (!item || videoVersion(item) !== record.videoVersion || finished(record.position, record.duration)) {
        clear();
        return null;
      }
      return resumable(record) ? { item, record } : null;
    }

    return { load, save, clear, clearFor, find, get failed() { return failed; } };
  }

  function seekPosition(position, offset, duration) {
    if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(offset)) return null;
    return Math.min(duration, Math.max(0, position + offset));
  }

  return { KEY, MIN_PROGRESS, END_MARGIN, MAX_AGE, videoVersion, valid, finished, resumable, formatPosition, createStore, seekPosition };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IBCPlaybackProgress;
