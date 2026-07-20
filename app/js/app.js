import { mount, go, store } from './ui/core.js';
import './ui/today.js';
import './ui/map.js';
import './ui/session.js';
import './ui/parent.js';

mount(document.getElementById('root'));
go('today');

// Offline support once served over http(s); no-op when opened from disk.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
