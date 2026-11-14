/**
 * Catálogo de muestra (ficticio). Al arrancar se insertan los productos que aún no existen;
 * nunca se sobrescriben los cambios hechos desde el panel de administración.
 * compare_at_cents = precio regular de referencia (se muestra tachado). stock null = sin control.
 */
const p = (id, name, category, size, price, extra = {}) => ({
  id, name, category, size, price_cents: Math.round(price * 100),
  image: `assets/${extra.image ?? id}.webp`, badge: extra.badge ?? '', description: extra.description ?? '',
  compare_at_cents: extra.compareAt ? Math.round(extra.compareAt * 100) : null, stock: extra.stock ?? null,
});

export const SEED_PRODUCTS = [
  p('pack-desayuno', 'Pack Desayuno Andino', 'Packs ahorro', 'Maca 250 g + Cacao 250 g + Chía 500 g', 79.9, { compareAt: 92.7, badge: 'Más elegido', stock: 6, description: 'Los tres básicos para tus desayunos y batidos en un solo pedido: maca andina, cacao natural y semillas de chía. Ahorras frente a comprarlos por separado.' }),
  p('maca', 'Maca Andina', 'Superalimentos', 'Bolsa de 250 g', 39.9, { compareAt: 45.9, badge: 'Selección natural', stock: 24, description: 'Maca en polvo de 250 g, práctica para sumar a jugos, avenas y batidos.' }),
  p('miel', 'Miel de abeja', 'Aceites y mieles', 'Frasco de 500 g', 34.9, { badge: 'Favorito', stock: 30, description: 'Miel de abeja en frasco de 500 g. Un toque dulce para bebidas, recetas y desayunos.' }),
  p('pack-pausa', 'Pack Pausa', 'Packs ahorro', 'Infusión 20 filtrantes + Miel 500 g', 47.9, { compareAt: 54.8, badge: 'Ideal para regalar', stock: 10, description: 'Una caja de infusión botánica y un frasco de miel para tu momento de pausa. También es un gran detalle para regalar.' }),
  p('infusion', 'Infusión botánica', 'Infusiones', 'Caja de 20 filtrantes', 19.9, { badge: 'Momento pausa', stock: 40, description: 'Infusión botánica en caja de 20 filtrantes, para disfrutar una pausa en tu rutina.' }),
  p('chia', 'Semillas de chía', 'Superalimentos', 'Bolsa de 500 g', 24.9, { compareAt: 29.9, badge: 'Oferta', stock: 35, description: 'Semillas de chía en bolsa de 500 g, para combinar con yogures, bebidas y preparaciones.' }),
  p('cacao', 'Cacao natural', 'Superalimentos', 'Bolsa de 250 g', 27.9, { badge: 'De la tierra', stock: 18, description: 'Cacao natural en polvo, para bebidas y recetas con sabor intenso.' }),
  p('aceite', 'Aceite de coco', 'Aceites y mieles', 'Frasco de 250 ml', 28.9, { badge: 'Versátil', stock: 20, description: 'Aceite de coco en frasco de 250 ml, para cocina y cuidado personal.' }),
  p('calendula', 'Crema de caléndula', 'Cuidado personal', 'Envase de 120 ml', 36.9, { compareAt: 42.9, badge: 'Cuidado diario', stock: 4, description: 'Crema cosmética con caléndula para el cuidado diario. Revisa la etiqueta e ingredientes antes de usar.' }),
  p('pack-dulce', 'Pack Dulce Natural', 'Packs ahorro', 'Miel 500 g + Cacao 250 g', 54.9, { compareAt: 62.8, badge: 'Ahorro', stock: 8, description: 'Miel y cacao natural para endulzar tus bebidas y postres caseros.' }),
  p('sacha', 'Aceite de sacha inchi', 'Aceites y mieles', 'Botella de 250 ml', 29.9, { badge: 'Origen vegetal', stock: 3, description: 'Aceite vegetal de sacha inchi en botella de 250 ml, para aliños y preparaciones en frío.' }),
  p('maca-500', 'Maca Andina · Tamaño ahorro', 'Superalimentos', 'Bolsa de 500 g', 69.9, { image: 'maca', compareAt: 79.8, badge: 'Rinde más', stock: 12, description: 'La misma maca andina en presentación de 500 g. Rinde el doble y pagas menos por gramo.' }),
  p('pack-cuidado', 'Pack Cuidado Natural', 'Packs ahorro', 'Crema de caléndula 120 ml + Aceite de coco 250 ml', 56.9, { compareAt: 65.8, badge: 'Ahorro', stock: 5, description: 'Crema de caléndula y aceite de coco para tu rutina de cuidado personal.' }),
  p('miel-1kg', 'Miel de abeja · Tamaño familiar', 'Aceites y mieles', 'Frasco de 1 kg', 64.9, { image: 'miel', compareAt: 69.8, badge: 'Rinde más', stock: 9, description: 'Miel de abeja en frasco de 1 kg, para toda la familia.' }),
  p('chia-1kg', 'Semillas de chía · Tamaño ahorro', 'Superalimentos', 'Bolsa de 1 kg', 44.9, { image: 'chia', compareAt: 49.8, badge: 'Rinde más', stock: 15, description: 'Semillas de chía en bolsa de 1 kg, para preparar todo el mes.' }),
  p('pack-cocina', 'Pack Cocina Vegetal', 'Packs ahorro', 'Aceite de coco 250 ml + Sacha inchi 250 ml', 51.9, { compareAt: 58.8, badge: 'Ahorro', stock: 7, description: 'Dos aceites vegetales para cocinar y aliñar: coco para calor y sacha inchi para preparaciones en frío.' }),
  p('cacao-500', 'Cacao natural · Tamaño ahorro', 'Superalimentos', 'Bolsa de 500 g', 49.9, { image: 'cacao', compareAt: 55.8, badge: 'Rinde más', stock: 10, description: 'Cacao natural en polvo en bolsa de 500 g.' }),
  p('infusion-x3', 'Infusión botánica · Pack x3', 'Infusiones', '3 cajas de 20 filtrantes', 49.9, { image: 'infusion', compareAt: 59.7, badge: 'Lleva 3, paga menos', stock: 14, description: 'Tres cajas de infusión botánica, 60 filtrantes en total.' }),
  p('aceite-500', 'Aceite de coco · Tamaño ahorro', 'Aceites y mieles', 'Frasco de 500 ml', 49.9, { image: 'aceite', compareAt: 57.8, badge: 'Rinde más', stock: 11, description: 'Aceite de coco en frasco de 500 ml.' }),
  p('sacha-500', 'Aceite de sacha inchi · Tamaño ahorro', 'Aceites y mieles', 'Botella de 500 ml', 52.9, { image: 'sacha', compareAt: 59.8, badge: 'Rinde más', stock: 6, description: 'Aceite de sacha inchi en botella de 500 ml.' }),
];
