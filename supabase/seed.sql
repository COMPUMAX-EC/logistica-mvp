-- =====================================================================
-- MVP Logística — Datos de ejemplo
-- =====================================================================
-- Ejecuta este archivo DESPUÉS de schema.sql para tener productos
-- de prueba y poder generar pedidos de inmediato.
-- =====================================================================

insert into productos (sku, nombre, descripcion, precio, stock, stock_minimo) values
  ('SKU-001', 'Caja de cartón mediana',      'Caja 40x30x30 cm para embalaje',        1.50, 200, 30),
  ('SKU-002', 'Rollo de plástico burbuja',   'Rollo 1m x 50m',                         12.00, 40,  5),
  ('SKU-003', 'Cinta de embalaje',           'Rollo 48mm x 100m',                      2.30, 150, 20),
  ('SKU-004', 'Pallet de madera',            'Pallet estándar 1.2m x 1m',               8.75, 60,  10),
  ('SKU-005', 'Etiquetas térmicas (paq. 100)', 'Etiquetas para impresora térmica',      4.90, 90,  15),
  ('SKU-006', 'Guantes de manejo (par)',     'Guantes de nitrilo talla M',              1.20, 300, 50),
  ('SKU-007', 'Carretilla manual',           'Carretilla de carga 150kg',              45.00, 8,   2),
  ('SKU-008', 'Precinto de seguridad',       'Precinto plástico numerado',              0.35, 500, 100)
on conflict (sku) do nothing;
