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

export async function askTutor({ question, topic, apiKey }) {
  if (!navigator.onLine) { const e = new Error('offline'); e.offline = true; throw e; }
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
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: systemPrompt(topic),
        messages: [{ role: 'user', content: question }],
      }),
    });
  } catch {
    const e = new Error('network'); e.offline = true; throw e;
  }
  if (!res.ok) {
    const e = new Error('api ' + res.status); e.status = res.status; throw e;
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
