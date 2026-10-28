// Uniform selection and balanced prompt rotations; no answers are stored here.
(function (root) {
  'use strict';

  function normalize(value) {
    return String(value ?? '').normalize('NFKC')
      .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').toLowerCase();
  }

  function randomInt(limit) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 0x100000000) {
      throw new RangeError('Random selection requires a nonempty pool.');
    }
    if (root.crypto?.getRandomValues) {
      // Reject the incomplete range, avoiding modulo bias for any pool size.
      const cutoff = 0x100000000 - (0x100000000 % limit);
      const buffer = new Uint32Array(1);
      do { root.crypto.getRandomValues(buffer); } while (buffer[0] >= cutoff);
      return buffer[0] % limit;
    }
    return Math.floor(Math.random() * limit);
  }

  function unique(items, key = item => typeof item === 'string' ? item : item.t) {
    const seen = new Set();
    return items.filter(item => {
      const id = normalize(key(item));
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  class PromptPicker {
    constructor({ storageKey = '', storage, randomIndex = randomInt } = {}) {
      this.counts = new Map();
      this.last = '';
      this.storageKey = storageKey;
      this.randomIndex = randomIndex;
      try {
        this.storage = storage === undefined ? root.localStorage : storage;
        const saved = JSON.parse(this.storage?.getItem(storageKey) || 'null');
        if (saved?.version === 1 && Array.isArray(saved.counts)) {
          for (const entry of saved.counts) {
            if (Array.isArray(entry) && typeof entry[0] === 'string' &&
                Number.isSafeInteger(entry[1]) && entry[1] >= 0) {
              this.counts.set(entry[0], entry[1]);
            }
          }
          this.last = typeof saved.last === 'string' ? saved.last : '';
        }
      } catch (error) {
        // Private mode or unavailable storage still gets an in-memory rotation.
      }
    }

    take(items, { key = item => typeof item === 'string' ? item : item.t, avoid = '' } = {}) {
      const pool = unique(items, key);
      if (!pool.length) return null;
      const avoidKey = normalize(avoid);
      let eligible = pool.filter(item => {
        const id = normalize(key(item));
        return id !== this.last && id !== avoidKey;
      });
      // Always permit a draw when only one eligible prompt is available.
      if (!eligible.length) eligible = pool.filter(item => normalize(key(item)) !== avoidKey);
      if (!eligible.length) eligible = pool;

      let least = Infinity;
      let candidates = [];
      for (const item of eligible) {
        const count = this.counts.get(normalize(key(item))) || 0;
        if (count < least) { least = count; candidates = [item]; }
        else if (count === least) candidates.push(item);
      }
      // Sampling the least-used prompts uniformly gives a random order without
      // repeats in a fixed pool until every prompt has appeared in that rotation.
      const selected = candidates[this.randomIndex(candidates.length)];
      const id = normalize(key(selected));
      this.counts.set(id, (this.counts.get(id) || 0) + 1);
      this.last = id;
      if (this.storageKey) {
        try {
          this.storage?.setItem(this.storageKey, JSON.stringify({
            version: 1, counts: [...this.counts], last: this.last
          }));
        } catch (error) { /* Continue the session when browser storage is full. */ }
      }
      return selected;
    }
  }

  const api = { normalize, randomInt, unique, PromptPicker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KamaRandom = api;
})(globalThis);
