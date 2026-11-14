/**
 * ASIRI API + servidor de la web.
 * Público:  catálogo, pedidos, newsletter y contacto.
 * Admin:    /api/admin/* con cabecera "Authorization: Bearer <ADMIN_TOKEN>".
 */
import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Solo se publican los archivos de la web; nunca server/, package.json, .git, etc.
const PUBLIC_PATH = /^\/(?:|index\.html|app\.js|motion\.js|styles\.css|landing\.css|admin\/?|admin\/[\w.-]+|assets\/[\w.-]+)$/;

const ORDER_STATUSES = ['nuevo', 'confirmado', 'pagado', 'enviado', 'entregado', 'cancelado'];
const MAX_ITEMS = 30;
const MAX_QTY = 99;
const LOW_STOCK = 5; // desde aquí se muestra «Quedan N»

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// ---------- validación ----------
// Nombres legibles para los mensajes de error que ve el cliente.
const LABELS = {
  'customer.name': 'nombre', 'customer.phone': 'celular', 'customer.email': 'correo',
  'delivery.district': 'distrito', 'delivery.address': 'dirección', notes: 'notas',
  email: 'correo', name: 'nombre', contact: 'correo o celular', message: 'mensaje',
};
const label = field => LABELS[field] ?? field;
const str = (v, { field, max = 200, required = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new HttpError(400, `Completa el campo "${label(field)}".`, { field });
    return null;
  }
  if (typeof v !== 'string') throw new HttpError(400, `El campo "${label(field)}" debe ser texto.`, { field });
  const s = v.trim();
  if (required && !s) throw new HttpError(400, `Completa el campo "${label(field)}".`, { field });
  if (s.length > max) throw new HttpError(400, `El campo "${label(field)}" supera ${max} caracteres.`, { field });
  return s || null;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const email = (v, opts) => {
  const s = str(v, { ...opts, max: 254 });
  if (s && !EMAIL.test(s)) throw new HttpError(400, 'El correo electrónico no es válido.', { field: opts.field });
  return s?.toLowerCase() ?? null;
};
const phone = (v, opts) => {
  const s = str(v, { ...opts, max: 30 });
  if (s && !/^\+?[\d\s()-]{6,20}$/.test(s)) throw new HttpError(400, 'El teléfono no es válido.', { field: opts.field });
  return s;
};
const int = (v, { field, min = 0, max = 1e9, nullable = false }) => {
  if (nullable && (v === null || v === '')) return null;
  if (!Number.isInteger(v) || v < min || v > max) throw new HttpError(400, `El campo "${field}" debe ser un entero entre ${min} y ${max}.`, { field });
  return v;
};

// ---------- formato ----------
const toProduct = r => ({
  id: r.id, name: r.name, category: r.category, size: r.size,
  price: r.price_cents / 100, priceCents: r.price_cents,
  compareAtPrice: r.compare_at_cents > r.price_cents ? r.compare_at_cents / 100 : null,
  image: r.image, badge: r.badge, description: r.description,
  inStock: r.stock === null || r.stock > 0,
  stockLeft: r.stock !== null && r.stock > 0 && r.stock <= LOW_STOCK ? r.stock : null,
});
const toAdminProduct = r => ({ ...toProduct(r), compareAtCents: r.compare_at_cents, stock: r.stock, active: r.active, sortOrder: r.sort_order, updatedAt: r.updated_at });
const toOrder = (o, items) => ({
  code: o.code, status: o.status,
  customer: { name: o.customer_name, phone: o.customer_phone, email: o.customer_email },
  delivery: { method: o.delivery_method, district: o.district, address: o.address },
  notes: o.notes,
  items: items.map(i => ({ productId: i.product_id, name: i.name, size: i.size, unitPrice: i.unit_price_cents / 100, quantity: i.quantity, lineTotal: (i.unit_price_cents * i.quantity) / 100 })),
  subtotal: o.subtotal_cents / 100,
  shipping: o.shipping_cents / 100,
  total: (o.subtotal_cents + o.shipping_cents) / 100,
  createdAt: o.created_at, updatedAt: o.updated_at,
});
const soles = cents => 'S/ ' + (cents / 100).toFixed(2);

function orderCode() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = [...randomBytes(4)].map(b => alphabet[b % alphabet.length]).join('');
  return `ASI-${ymd}-${rand}`;
}

function whatsappLink(number, order) {
  if (!number) return null;
  const lines = [
    `Hola ASIRI, acabo de hacer el pedido *${order.code}*:`,
    ...order.items.map(i => `• ${i.quantity} × ${i.name} (${i.size})`),
    `Subtotal: ${soles(Math.round(order.subtotal * 100))}`,
    `Envío: ${order.shipping ? soles(Math.round(order.shipping * 100)) : 'gratis'}`,
    `*Total: ${soles(Math.round(order.total * 100))}*`,
    order.delivery.method === 'delivery' ? `Entrega en: ${[order.delivery.address, order.delivery.district].filter(Boolean).join(', ')}` : 'Recojo en tienda',
    `A nombre de: ${order.customer.name}`,
  ];
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/** Límite de peticiones simple en memoria, por IP y ruta. */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, _res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const n = (hits.get(key) ?? 0) + 1;
    hits.set(key, n);
    if (n > max) return next(new HttpError(429, 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.'));
    next();
  };
}

export function createApp(db, config = {}) {
  const { adminToken, whatsappNumber, allowedOrigins = [], rateLimitMax = 20, shippingFeeCents = 1000, freeShippingFromCents = 12000 } = config;
  // Envío: gratis desde cierto monto; recojo en tienda siempre gratis.
  const shippingFor = (method, subtotal) => (method === 'recojo' || subtotal >= freeShippingFromCents ? 0 : shippingFeeCents);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '50kb' }));

  // CORS: permite que la versión de GitHub Pages use esta API.
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    res.set('Cache-Control', 'no-store');
    next();
  });

  const publicWrite = rateLimit({ windowMs: 10 * 60 * 1000, max: rateLimitMax });
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  // ---------- público ----------
  app.get('/api/health', wrap(async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  }));

  app.get('/api/config', (_req, res) => {
    res.json({ whatsapp: Boolean(whatsappNumber), currency: 'PEN', orderStatuses: ORDER_STATUSES, shippingFee: shippingFeeCents / 100, freeShippingFrom: freeShippingFromCents / 100 });
  });

  app.get('/api/products', wrap(async (req, res) => {
    const category = str(req.query.category, { field: 'category' });
    const { rows } = await db.query(
      `SELECT * FROM products WHERE active AND ($1::text IS NULL OR category = $1) ORDER BY sort_order, name`,
      [category],
    );
    res.json({ products: rows.map(toProduct) });
  }));

  app.get('/api/products/:id', wrap(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1 AND active', [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'Producto no encontrado.');
    res.json({ product: toProduct(rows[0]) });
  }));

  app.post('/api/orders', publicWrite, wrap(async (req, res) => {
    const body = req.body ?? {};
    const c = body.customer ?? {};
    const d = body.delivery ?? {};
    const customer = {
      name: str(c.name, { field: 'customer.name', required: true, max: 120 }),
      phone: phone(c.phone, { field: 'customer.phone', required: true }),
      email: email(c.email, { field: 'customer.email' }),
    };
    const method = d.method ?? 'delivery';
    if (!['delivery', 'recojo'].includes(method)) throw new HttpError(400, 'El método de entrega debe ser "delivery" o "recojo".', { field: 'delivery.method' });
    const delivery = {
      method,
      district: str(d.district, { field: 'delivery.district', required: method === 'delivery', max: 80 }),
      address: str(d.address, { field: 'delivery.address', required: method === 'delivery', max: 250 }),
    };
    const notes = str(body.notes, { field: 'notes', max: 500 });

    if (!Array.isArray(body.items) || !body.items.length) throw new HttpError(400, 'El pedido no tiene productos.', { field: 'items' });
    if (body.items.length > MAX_ITEMS) throw new HttpError(400, `Máximo ${MAX_ITEMS} productos distintos por pedido.`, { field: 'items' });
    const qty = new Map();
    for (const [i, item] of body.items.entries()) {
      const id = str(item?.productId, { field: `items[${i}].productId`, required: true, max: 60 });
      const q = int(item?.quantity, { field: `items[${i}].quantity`, min: 1, max: MAX_QTY });
      qty.set(id, Math.min(MAX_QTY, (qty.get(id) ?? 0) + q));
    }

    const order = await db.tx(async q => {
      // Precios y stock siempre desde la base de datos, nunca desde el navegador.
      const { rows: products } = await q('SELECT * FROM products WHERE id = ANY($1::text[]) AND active FOR UPDATE', [[...qty.keys()]]);
      const byId = new Map(products.map(p => [p.id, p]));
      const missing = [...qty.keys()].filter(id => !byId.has(id));
      if (missing.length) throw new HttpError(409, 'Algunos productos ya no están disponibles.', { productIds: missing });
      const short = [...qty].filter(([id, n]) => byId.get(id).stock !== null && byId.get(id).stock < n).map(([id]) => ({ productId: id, available: byId.get(id).stock }));
      if (short.length) throw new HttpError(409, 'No hay stock suficiente para algunos productos.', { stock: short });

      const subtotal = [...qty].reduce((sum, [id, n]) => sum + byId.get(id).price_cents * n, 0);
      const { rows: [o] } = await q(
        `INSERT INTO orders (code, customer_name, customer_phone, customer_email, delivery_method, district, address, notes, subtotal_cents, shipping_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [orderCode(), customer.name, customer.phone, customer.email, delivery.method, delivery.district, delivery.address, notes, subtotal, shippingFor(delivery.method, subtotal)],
      );
      const items = [];
      for (const [id, n] of qty) {
        const p = byId.get(id);
        const { rows: [it] } = await q(
          `INSERT INTO order_items (order_id, product_id, name, size, unit_price_cents, quantity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [o.id, p.id, p.name, p.size, p.price_cents, n],
        );
        items.push(it);
        if (p.stock !== null) await q('UPDATE products SET stock = stock - $2, updated_at = now() WHERE id = $1', [id, n]);
      }
      return toOrder(o, items);
    });

    res.status(201).json({ order, whatsappUrl: whatsappLink(whatsappNumber, order) });
  }));

  app.post('/api/newsletter', publicWrite, wrap(async (req, res) => {
    const e = email(req.body?.email, { field: 'email', required: true });
    await db.query('INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [e]);
    res.status(201).json({ ok: true });
  }));

  app.post('/api/contact', publicWrite, wrap(async (req, res) => {
    const b = req.body ?? {};
    const name = str(b.name, { field: 'name', required: true, max: 120 });
    const contact = str(b.contact, { field: 'contact', required: true, max: 254 });
    const message = str(b.message, { field: 'message', required: true, max: 2000 });
    await db.query('INSERT INTO messages (name, contact, message) VALUES ($1,$2,$3)', [name, contact, message]);
    res.status(201).json({ ok: true });
  }));

  // ---------- administración ----------
  const admin = express.Router();
  admin.use((req, _res, next) => {
    if (!adminToken) return next(new HttpError(503, 'Configura ADMIN_TOKEN para usar la administración.'));
    const given = Buffer.from((req.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
    const expected = Buffer.from(adminToken);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return next(new HttpError(401, 'No autorizado.'));
    next();
  });

  admin.get('/products', wrap(async (_req, res) => {
    const { rows } = await db.query('SELECT * FROM products ORDER BY sort_order, name');
    res.json({ products: rows.map(toAdminProduct) });
  }));

  const PRODUCT_FIELDS = {
    name: ['name', v => str(v, { field: 'name', required: true, max: 120 })],
    category: ['category', v => str(v, { field: 'category', required: true, max: 60 })],
    size: ['size', v => str(v, { field: 'size', max: 80 }) ?? ''],
    priceCents: ['price_cents', v => int(v, { field: 'priceCents', min: 0, max: 10_000_000 })],
    compareAtCents: ['compare_at_cents', v => int(v, { field: 'compareAtCents', min: 1, max: 10_000_000, nullable: true })],
    image: ['image', v => str(v, { field: 'image', max: 500 }) ?? ''],
    badge: ['badge', v => str(v, { field: 'badge', max: 40 }) ?? ''],
    description: ['description', v => str(v, { field: 'description', max: 2000 }) ?? ''],
    stock: ['stock', v => int(v, { field: 'stock', min: 0, max: 1_000_000, nullable: true })],
    active: ['active', v => { if (typeof v !== 'boolean') throw new HttpError(400, 'El campo "active" debe ser true o false.', { field: 'active' }); return v; }],
    sortOrder: ['sort_order', v => int(v, { field: 'sortOrder', min: -1e6, max: 1e6 })],
  };
  const productColumns = body => Object.entries(PRODUCT_FIELDS).filter(([k]) => k in body).map(([k, [col, parse]]) => [col, parse(body[k])]);

  admin.post('/products', wrap(async (req, res) => {
    const body = req.body ?? {};
    const id = str(body.id, { field: 'id', required: true, max: 60 });
    if (!/^[a-z0-9-]+$/.test(id)) throw new HttpError(400, 'El id solo puede tener minúsculas, números y guiones.', { field: 'id' });
    for (const k of ['name', 'category', 'priceCents']) if (!(k in body)) throw new HttpError(400, `El campo "${k}" es obligatorio.`, { field: k });
    const cols = [['id', id], ...productColumns(body)];
    const { rows } = await db.query(
      `INSERT INTO products (${cols.map(c => c[0]).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')})
       ON CONFLICT (id) DO NOTHING RETURNING *`,
      cols.map(c => c[1]),
    );
    if (!rows.length) throw new HttpError(409, 'Ya existe un producto con ese id.', { field: 'id' });
    res.status(201).json({ product: toAdminProduct(rows[0]) });
  }));

  admin.patch('/products/:id', wrap(async (req, res) => {
    const cols = productColumns(req.body ?? {});
    if (!cols.length) throw new HttpError(400, 'No hay cambios para guardar.');
    const { rows } = await db.query(
      `UPDATE products SET ${cols.map((c, i) => `${c[0]} = $${i + 2}`).join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id, ...cols.map(c => c[1])],
    );
    if (!rows.length) throw new HttpError(404, 'Producto no encontrado.');
    res.json({ product: toAdminProduct(rows[0]) });
  }));

  admin.get('/orders', wrap(async (req, res) => {
    const status = str(req.query.status, { field: 'status' });
    if (status && !ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Estado no válido.', { field: 'status' });
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const { rows: orders } = await db.query(
      `SELECT * FROM orders WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id', [orders.map(o => o.id)]);
    res.json({ orders: orders.map(o => toOrder(o, items.filter(i => i.order_id === o.id))), limit, offset });
  }));

  admin.patch('/orders/:code', wrap(async (req, res) => {
    const status = req.body?.status;
    if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, `Estado no válido. Usa: ${ORDER_STATUSES.join(', ')}.`, { field: 'status' });
    const order = await db.tx(async q => {
      const { rows: [current] } = await q('SELECT * FROM orders WHERE code = $1 FOR UPDATE', [req.params.code]);
      if (!current) throw new HttpError(404, 'Pedido no encontrado.');
      const { rows: items } = await q('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [current.id]);
      // Cancelar devuelve el stock; reabrir un pedido cancelado lo vuelve a descontar.
      const restock = status === 'cancelado' && current.status !== 'cancelado' ? 1 : current.status === 'cancelado' && status !== 'cancelado' ? -1 : 0;
      for (const it of restock ? items : []) {
        const { rows: [p] } = await q('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [it.product_id]);
        if (!p || p.stock === null) continue;
        if (p.stock + restock * it.quantity < 0) throw new HttpError(409, `No hay stock suficiente de "${it.name}" para reabrir el pedido.`);
        await q('UPDATE products SET stock = stock + $2, updated_at = now() WHERE id = $1', [it.product_id, restock * it.quantity]);
      }
      const { rows: [o] } = await q('UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *', [current.id, status]);
      return toOrder(o, items);
    });
    res.json({ order });
  }));

  admin.get('/subscribers', wrap(async (_req, res) => {
    const { rows } = await db.query('SELECT email, created_at FROM subscribers ORDER BY created_at DESC');
    res.json({ subscribers: rows.map(r => ({ email: r.email, createdAt: r.created_at })) });
  }));

  admin.get('/messages', wrap(async (_req, res) => {
    const { rows } = await db.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200');
    res.json({ messages: rows.map(r => ({ id: r.id, name: r.name, contact: r.contact, message: r.message, read: r.read, createdAt: r.created_at })) });
  }));

  admin.patch('/messages/:id', wrap(async (req, res) => {
    const read = req.body?.read;
    if (typeof read !== 'boolean') throw new HttpError(400, 'El campo "read" debe ser true o false.', { field: 'read' });
    const { rows } = await db.query('UPDATE messages SET read = $2 WHERE id = $1 RETURNING id', [Number.parseInt(req.params.id, 10) || 0, read]);
    if (!rows.length) throw new HttpError(404, 'Mensaje no encontrado.');
    res.json({ ok: true });
  }));

  app.use('/api/admin', admin);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada.')));

  // ---------- web estática ----------
  app.use((req, res, next) => (PUBLIC_PATH.test(req.path) ? next() : res.status(404).send('No encontrado')));
  app.use(express.static(ROOT, { dotfiles: 'deny', index: 'index.html', maxAge: '1h', setHeaders: (res, path) => { if (path.endsWith('.html')) res.set('Cache-Control', 'no-cache'); } }));

  // ---------- errores ----------
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') err = new HttpError(400, 'El cuerpo de la solicitud no es JSON válido.');
    if (err.type === 'entity.too.large') err = new HttpError(413, 'La solicitud es demasiado grande.');
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: { message: status === 500 ? 'Error interno del servidor.' : err.message, ...(err.details && { details: err.details }) } });
  });

  return app;
}
