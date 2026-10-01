import http from 'node:http';

// Synthetic, in-memory HTTP service. One process; no persistence or auth.
export async function startService() {
  const orders = [];
  const keys = new Map();
  let dropNext = true;
  const server = http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'POST' || req.url !== '/orders') return send(404, {error: 'not_found'});
    let payload;
    try {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      payload = JSON.parse(raw);
    } catch { return send(400, {error: 'invalid_json'}); }
    if (payload.sku !== 'demo-notebook' || !Number.isInteger(payload.quantity) || payload.quantity < 1) {
      return send(422, {error: 'invalid_order'});
    }
    const key = req.headers['idempotency-key'];
    const fingerprint = JSON.stringify({sku: payload.sku, quantity: payload.quantity});
    if (key && keys.has(key)) {
      const previous = keys.get(key);
      if (previous.fingerprint !== fingerprint) return send(409, {error: 'key_payload_conflict'});
      return send(200, {...previous.order, replayed: true});
    }
    const order = {id: `ord_${String(orders.length + 1).padStart(3, '0')}`, ...payload};
    orders.push(order);
    if (key) keys.set(key, {fingerprint, order});
    // Deterministic fault injection: commit the first order, then close the socket.
    if (dropNext) { dropNext = false; res.destroy(); return; }
    send(201, {...order, replayed: false});
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    orders,
    close: () => new Promise(resolve => {server.close(resolve); server.closeAllConnections();}),
  };
}
