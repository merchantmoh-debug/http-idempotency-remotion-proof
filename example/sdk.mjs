// The caller keeps one key for one logical operation, including every retry.
// VIDEO_SNIPPET_START
export async function createOrder(baseUrl, payload, key) {
  return fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? {'Idempotency-Key': key} : {}),
    },
    body: JSON.stringify(payload),
  });
}
// VIDEO_SNIPPET_END
