import { createDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const db = await createDb();
const app = createApp(db, {
  adminToken: process.env.ADMIN_TOKEN,
  whatsappNumber: process.env.WHATSAPP_NUMBER,
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'https://shopincore.github.io').split(',').map(s => s.trim()).filter(Boolean),
  shippingFeeCents: Math.round(Number(process.env.SHIPPING_FEE ?? 10) * 100),
  freeShippingFromCents: Math.round(Number(process.env.FREE_SHIPPING_FROM ?? 120) * 100),
});

const server = app.listen(port, () => console.log(`ASIRI escuchando en http://localhost:${port}`));
const shutdown = () => server.close(() => db.close().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
