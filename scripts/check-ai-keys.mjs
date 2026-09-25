// Checks that the content pipeline's API keys work, with the smallest possible call to each
// provider. Prints which ones answered; never prints a key.
//
// Exits 1 only when neither provider works, because one working key is enough to keep the pipeline
// running.

const checks = [
  {
    name: 'Anthropic',
    secret: 'ANTHROPIC_API_KEY',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    call: (key, model) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 4, messages: [{ role: 'user', content: 'Reply with the word ok.' }] }),
      }),
  },
  {
    name: 'OpenAI',
    secret: 'OPENAI_API_KEY',
    model: process.env.OPENAI_MODEL || 'gpt-5',
    call: (key, model) =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, max_completion_tokens: 16, messages: [{ role: 'user', content: 'Reply with the word ok.' }] }),
      }),
  },
];

let working = 0;
for (const check of checks) {
  const key = process.env[check.secret];
  if (!key) {
    console.log(`${check.name}: no ${check.secret} set`);
    continue;
  }
  if (key !== key.trim()) console.log(`${check.name}: the secret has a space or newline around it, which is usually why a key is refused`);
  // Shape only: the first few characters and the length. Enough to spot the wrong kind of key.
  const shape = `${key.trim().slice(0, 8)}… ${key.trim().length} characters`;
  console.log(`${check.name}: key looks like ${shape}`);
  try {
    const res = await check.call(key.trim(), check.model);
    if (res.ok) {
      console.log(`${check.name}: working (${check.model})`);
      working++;
    } else {
      const body = await res.text();
      const message = (() => {
        try {
          const j = JSON.parse(body);
          return j.error?.message ?? body;
        } catch {
          return body;
        }
      })();
      console.log(`${check.name}: refused, HTTP ${res.status} — ${String(message).slice(0, 160)}`);
      if (check.name === 'Anthropic' && res.status === 401) {
        // Does the key work at all, or is it only this model? /v1/models needs no model access.
        const probe = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': key.trim(), 'anthropic-version': '2023-06-01' } });
        console.log(`Anthropic: listing models with the same key gives HTTP ${probe.status}${probe.ok ? ' (so the key is valid and the problem is the model)' : ' (so the key itself is not accepted)'}`);
      }
    }
  } catch (e) {
    console.log(`${check.name}: could not be reached — ${e.message.slice(0, 160)}`);
  }
}

console.log(working ? `\n${working} of ${checks.length} providers working. The pipeline can run.` : '\nNeither provider works. The pipeline cannot write a draft.');
if (!working) process.exitCode = 1;
