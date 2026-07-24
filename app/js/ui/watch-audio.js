// Snippet prefetch + playback for Watch episodes. This module is the single
// owner of <audio>/blob mechanics — if iPad Safari ever balks at chained
// playback, the Web Audio fallback (decodeAudioData on the kept blobs)
// replaces only this file's internals.
//
// Playback contract: ONE reused Audio element, blob: URLs, the first play()
// called synchronously from a user tap (iOS gesture unlock), later steps
// chained from the 'ended' event on the same element.

export const MEDIA_CACHE = 'pmtrainer-media-v1'; // must match app/sw.js

// Fetch every snippet as a Blob (in step order), mint object URLs, and warm
// the media cache so offline rewatching works even on the very first visit,
// before the service worker controls the page. Blobs are kept for the Web
// Audio fallback. Returns { urls, blobs, revoke }.
export async function prefetchEpisode(ep, base, { onProgress = () => {} } = {}) {
  const urls = [];
  const blobs = [];
  let cache = null;
  try {
    if ('caches' in window) cache = await caches.open(MEDIA_CACHE);
  } catch { /* localhost dev, private mode: playback works without the cache */ }
  for (let i = 0; i < ep.steps.length; i++) {
    const path = base + ep.steps[i].audio;
    const res = await fetch(path);
    if (!res.ok) throw new Error(`audio ${ep.steps[i].audio}: HTTP ${res.status}`);
    if (cache) {
      try { await cache.put(path, res.clone()); } catch { /* quota — playback unaffected */ }
    }
    const blob = await res.blob();
    blobs.push(blob);
    urls.push(URL.createObjectURL(blob));
    onProgress(i + 1, ep.steps.length);
  }
  return {
    urls,
    blobs,
    revoke() { for (const u of urls) URL.revokeObjectURL(u); },
  };
}

export function createPlayer() {
  const el = new Audio();
  el.preload = 'auto';
  let endedFn = null;
  let errorFn = null;
  el.addEventListener('ended', () => { if (endedFn) endedFn(); });
  el.addEventListener('error', () => { if (errorFn) errorFn(); });
  return {
    load(url) { el.src = url; },
    // Returns the play() promise — callers must handle rejection (iOS can
    // refuse a play() that lost its gesture blessing; never hang silently).
    play() { return el.play(); },
    pause() { el.pause(); },
    onEnded(fn) { endedFn = fn; },
    onError(fn) { errorFn = fn; },
    dispose() {
      endedFn = errorFn = null;
      el.pause();
      el.removeAttribute('src');
      el.load();
    },
  };
}
