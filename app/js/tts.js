// Thin wrapper over the Web Speech API. iPad Safari requires a user gesture to
// start speech, which our tap-to-play buttons provide. Voices load async.

let voices = [];

function refreshVoices() {
  voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}
if (window.speechSynthesis) {
  refreshVoices();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

export function available() {
  return 'speechSynthesis' in window;
}

export function englishVoices() {
  refreshVoices();
  return voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
}

function chooseVoice(preferredURI) {
  refreshVoices();
  if (preferredURI) {
    const v = voices.find((v) => v.voiceURI === preferredURI);
    if (v) return v;
  }
  const en = englishVoices();
  return (
    en.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
    en.find((v) => v.default) ||
    en[0] ||
    null
  );
}

// speak() resolves when the utterance ends or errors; onboundary drives highlighting.
export function speak(text, { rate = 0.95, voiceURI = null, onend = null } = {}) {
  if (!available()) return;
  stop();
  const u = new SpeechSynthesisUtterance(text);
  const v = chooseVoice(voiceURI);
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-GB'; }
  u.rate = rate;
  if (onend) { u.onend = onend; u.onerror = onend; }
  speechSynthesis.speak(u);
}

export function stop() {
  if (available()) speechSynthesis.cancel();
}

export function speaking() {
  return available() && speechSynthesis.speaking;
}
