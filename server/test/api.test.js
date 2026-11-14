import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../db.js';
import { createApp } from '../app.js';

const TOKEN = 'test-admin-token';
let db, server, base;

before(async () => {
  db = await createDb('memory');
  const app = createApp(db, { adminToken: TOKEN, whatsappNumber: '+51 999 888 777', allowedOrigins: ['https://shopincore.github.io'], rateLimitMax: 1000 });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.close(); await db.close(); });

const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, headers: res.headers, json: type.includes('json') ? await res.json() : null };
};
const validOrder = (items = [{ productId: 'maca', quantity: 2 }, { productId: 'miel', quantity: 1 }]) => ({
  customer: { name: 'Ana Pérez', phone: '+51 987 654 321', email: 'Ana@Example.com' },
  delivery: { method: 'delivery', district: 'Miraflores', address: 'Av. Larco 123' },
  items,
});

test('health y catálogo inicial', async () => {
  assert.equal((await api('/api/health')).json.ok, true);
  const { json } = await api('/api/products');
  assert.equal(json.products.length, 20);
  const maca = json.products.find(p => p.id === 'maca');
  assert.deepEqual(maca, { id: 'maca', name: 'Maca Andina', category: 'Superalimentos', size: 'Bolsa de 250 g', price: 39.9, priceCents: 3990, compareAtPrice: 45.9, image: 'assets/maca.webp', badge: 'Selección natural', description: maca.description, inStock: true, stockLeft: null });
  assert.equal(json.products.find(p => p.id === 'sacha').stockLeft, 3);
  assert.equal(json.products.find(p => p.id === 'maca-500').image, 'assets/maca.webp');
  assert.equal((await api('/api/products?category=Packs%20ahorro')).json.products.length, 5);
  assert.equal((await api('/api/products?category=Infusiones')).json.products.length, 2);
  assert.equal((await api('/api/products/nope')).status, 404);
});

test('crear pedido calcula precios en el servidor y genera WhatsApp', async () => {
  const { status, json } = await api('/api/orders', { method: 'POST', body: { ...validOrder(), items: [{ productId: 'maca', quantity: 2, price: 0.01 }, { productId: 'miel', quantity: 1 }] } });
  assert.equal(status, 201);
  assert.match(json.order.code, /^ASI-\d{6}-[A-Z2-9]{4}$/);
  assert.equal(json.order.subtotal, 114.7); // 2 × 39.90 + 34.90, ignorando el precio enviado
  assert.equal(json.order.shipping, 10); // por debajo de S/ 120
  assert.equal(json.order.total, 124.7);
  assert.equal(json.order.customer.email, 'ana@example.com');
  assert.equal(json.order.status, 'nuevo');
  assert.ok(json.whatsappUrl.startsWith('https://wa.me/51999888777?text='));
  assert.ok(decodeURIComponent(json.whatsappUrl).includes(json.order.code));
});

test('validación de pedidos', async () => {
  const cases = [
    [{ ...validOrder(), items: [] }, 400],
    [{ ...validOrder(), customer: { phone: '999888777' } }, 400],
    [{ ...validOrder(), customer: { name: 'A', phone: 'abc' } }, 400],
    [{ ...validOrder(), delivery: { method: 'delivery' } }, 400],
    [{ ...validOrder(), items: [{ productId: 'maca', quantity: 0 }] }, 400],
    [{ ...validOrder(), items: [{ productId: 'maca', quantity: 1.5 }] }, 400],
    [{ ...validOrder(), items: [{ productId: 'inexistente', quantity: 1 }] }, 409],
  ];
  for (const [body, expected] of cases) assert.equal((await api('/api/orders', { method: 'POST', body })).status, expected, JSON.stringify(body));
  const pickup = await api('/api/orders', { method: 'POST', body: { ...validOrder(), delivery: { method: 'recojo' } } });
  assert.equal(pickup.status, 201);
  assert.equal(pickup.json.order.shipping, 0);
  const free = await api('/api/orders', { method: 'POST', body: validOrder([{ productId: 'maca', quantity: 3 }]) });
  assert.equal(free.json.order.shipping, 10); // S/ 119.70: aún no llega a S/ 120
  const free2 = await api('/api/orders', { method: 'POST', body: validOrder([{ productId: 'maca', quantity: 4 }]) });
  assert.equal(free2.json.order.shipping, 0);
  assert.ok(decodeURIComponent(free2.json.whatsappUrl).includes('Envío: gratis'));
  const cfg = (await api('/api/config')).json;
  assert.equal(cfg.freeShippingFrom, 120);
  assert.equal(cfg.shippingFee, 10);
  const bad = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(bad.status, 400);
});

test('admin requiere token', async () => {
  assert.equal((await api('/api/admin/orders')).status, 401);
  assert.equal((await api('/api/admin/orders', { token: 'malo' })).status, 401);
  assert.equal((await api('/api/admin/orders', { token: TOKEN })).status, 200);
});

test('stock: descuenta, bloquea, y cancelar devuelve unidades', async () => {
  const patch = await api('/api/admin/products/cacao', { method: 'PATCH', token: TOKEN, body: { stock: 3 } });
  assert.equal(patch.json.product.stock, 3);
  const o = await api('/api/orders', { method: 'POST', body: validOrder([{ productId: 'cacao', quantity: 2 }]) });
  assert.equal(o.status, 201);
  const tooMany = await api('/api/orders', { method: 'POST', body: validOrder([{ productId: 'cacao', quantity: 2 }]) });
  assert.equal(tooMany.status, 409);
  assert.deepEqual(tooMany.json.error.details.stock, [{ productId: 'cacao', available: 1 }]);
  await api(`/api/admin/orders/${o.json.order.code}`, { method: 'PATCH', token: TOKEN, body: { status: 'cancelado' } });
  const after = (await api('/api/admin/products', { token: TOKEN })).json.products.find(p => p.id === 'cacao');
  assert.equal(after.stock, 3);
  await api('/api/admin/products/cacao', { method: 'PATCH', token: TOKEN, body: { stock: 0 } });
  assert.equal((await api('/api/products/cacao')).json.product.inStock, false);
});

test('admin: productos y pedidos', async () => {
  const created = await api('/api/admin/products', { method: 'POST', token: TOKEN, body: { id: 'te-verde', name: 'Té verde', category: 'Infusiones', priceCents: 1590 } });
  assert.equal(created.status, 201);
  assert.equal((await api('/api/admin/products', { method: 'POST', token: TOKEN, body: { id: 'te-verde', name: 'X', category: 'Y', priceCents: 1 } })).status, 409);
  await api('/api/admin/products/te-verde', { method: 'PATCH', token: TOKEN, body: { active: false } });
  assert.equal((await api('/api/products/te-verde')).status, 404);
  assert.equal((await api('/api/admin/products/te-verde', { method: 'PATCH', token: TOKEN, body: { priceCents: -5 } })).status, 400);

  const { json } = await api('/api/admin/orders?status=nuevo', { token: TOKEN });
  assert.ok(json.orders.length >= 1);
  assert.ok(json.orders.every(o => o.status === 'nuevo' && o.items.length));
  const code = json.orders[0].code;
  assert.equal((await api(`/api/admin/orders/${code}`, { method: 'PATCH', token: TOKEN, body: { status: 'volando' } })).status, 400);
  assert.equal((await api(`/api/admin/orders/${code}`, { method: 'PATCH', token: TOKEN, body: { status: 'confirmado' } })).json.order.status, 'confirmado');
});

test('newsletter y contacto', async () => {
  assert.equal((await api('/api/newsletter', { method: 'POST', body: { email: 'hola@asiri.pe' } })).status, 201);
  assert.equal((await api('/api/newsletter', { method: 'POST', body: { email: 'HOLA@asiri.pe' } })).status, 201);
  assert.equal((await api('/api/newsletter', { method: 'POST', body: { email: 'no-es-correo' } })).status, 400);
  assert.equal((await api('/api/admin/subscribers', { token: TOKEN })).json.subscribers.length, 1);
  assert.equal((await api('/api/contact', { method: 'POST', body: { name: 'Luis', contact: '999', message: 'Hola' } })).status, 201);
  assert.equal((await api('/api/contact', { method: 'POST', body: { name: 'Luis' } })).status, 400);
  const msgs = (await api('/api/admin/messages', { token: TOKEN })).json.messages;
  assert.equal(msgs.length, 1);
  assert.equal((await api(`/api/admin/messages/${msgs[0].id}`, { method: 'PATCH', token: TOKEN, body: { read: true } })).status, 200);
});

test('CORS para GitHub Pages y archivos privados ocultos', async () => {
  const res = await fetch(base + '/api/products', { headers: { Origin: 'https://shopincore.github.io' } });
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://shopincore.github.io');
  const other = await fetch(base + '/api/products', { headers: { Origin: 'https://evil.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
  for (const path of ['/package.json', '/server/app.js', '/.git/config', '/server/schema.sql', '/build_demo.py']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/assets/maca.webp')).status, 200);
  assert.equal((await api('/api/nada')).status, 404);
});
