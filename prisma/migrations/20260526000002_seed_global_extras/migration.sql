-- Seed global extras (idempotent)
INSERT INTO "GlobalExtra" (id, name, price, active) VALUES
  ('extra_bacon',    'Bacon',               4.0,  true),
  ('extra_ovo',      'Ovo frito',           3.0,  true),
  ('extra_queijo',   'Queijo extra',        2.5,  true),
  ('extra_cebola',   'Cebola caramelizada', 2.0,  true),
  ('extra_jalapeno', 'Jalapeño',            1.5,  true)
ON CONFLICT (id) DO NOTHING;
