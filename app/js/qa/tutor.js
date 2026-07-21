// Browser-direct call to the Anthropic Messages API ("bring your own key").
// The key lives only in this device's localStorage; backups strip it.

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

function systemPrompt(topic) {
  const notes = (topic.explanation?.segments ?? [])
    .map((s) => s.text.replace(/<[^>]*>/g, ''))
    .join(' ')
    .slice(0, 900);
  return [
    'You are a kind, patient maths tutor for a child who has just finished Year 5 (age 10) at a school using the UK Power Maths curriculum.',
    `Current topic: ${topic.title}. Lesson notes: ${notes}`,
    'Rules:',
    '- Answer only questions about maths. If asked about anything else, say one friendly sentence steering back to maths.',
    '- Keep answers under 90 words, in simple, warm language a 10-year-old understands.',
    '- Use the same methods as the lesson: place value, bar models, column method with exchange, short division.',
    '- Give one small example where it helps. Never just state a rule without a why.',
    '- Plain sentences only: no markdown, no headings, no lists.',
  ].join('\n');
}

// Errors carry: kind ('offline' | 'blocked' | 'http' | 'bad-response'),
// status (HTTP code) and detail (the API's own message) so the parent corner
// can show exactly what went wrong instead of a vague catch-all.
export class TutorError extends Error {
  constructor(kind, { status = null, detail = '' } = {}) {
    super(`${kind}${status ? ' ' + status : ''}${detail ? ': ' + detail : ''}`);
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    this.offline = kind === 'offline' || kind === 'blocked';
  }
}

export async function askTutor({ question, topic, apiKey }) {
  if (!navigator.onLine) throw new TutorError('offline');

  // Built outside the try: a bug here must not masquerade as a network failure.
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 300,
    system: systemPrompt(topic),
    messages: [{ role: 'user', content: question }],
  });

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    });
  } catch (e) {
    // Fetch only throws for transport-level failures: no connection, DNS
    // failure, or a content blocker / firewall dropping the request.
    throw new TutorError('blocked', { detail: String(e && e.message || e) });
  }

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || '';
    } catch {
      detail = (await res.text().catch(() => '')).slice(0, 200);
    }
    throw new TutorError('http', { status: res.status, detail });
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ')
    .trim();
  return text || 'I am not sure about that one — ask a parent!';
}

// Used by the parent corner to validate a freshly entered key.
export async function testKey(apiKey) {
  const fake = { title: 'a quick check', explanation: { segments: [] } };
  return askTutor({ question: 'Say the single word: ready', topic: fake, apiKey });
}
