exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Service unavailable' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Upstream error' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
