import { mount, go, store } from './ui/core.js';
import './ui/today.js';
import './ui/map.js';
import './ui/session.js';
import './ui/parent.js';

mount(document.getElementById('root'));
go('today');

// Offline support once served over http(s). Skipped on localhost so local
// development and the test runner always see fresh files.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isLocal) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
