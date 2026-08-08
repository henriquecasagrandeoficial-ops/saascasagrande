-- Cadeia de Herança de Custos: preço definido na liga + relação Wire → MetalAlloy.

-- 1) Preço oficial por grama na liga (definido pelo Admin)
ALTER TABLE "MetalAlloy" ADD COLUMN IF NOT EXISTS "pricePerGram" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: usa o custo teórico da mistura (puro × teor + pré-liga) quando ainda for 0
UPDATE "MetalAlloy"
SET "pricePerGram" = ("pureMetalPricePerG" * purity) + ("alloyMetalPricePerG" * (1 - purity))
WHERE "pricePerGram" = 0
  AND ("pureMetalPricePerG" > 0 OR "alloyMetalPricePerG" > 0);

-- 2) Liga base no fio/chapa
ALTER TABLE "Wire" ADD COLUMN IF NOT EXISTS "alloyId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Wire_alloyId_fkey'
  ) THEN
    ALTER TABLE "Wire"
      ADD CONSTRAINT "Wire_alloyId_fkey"
      FOREIGN KEY ("alloyId") REFERENCES "MetalAlloy"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Wire_alloyId_idx" ON "Wire"("alloyId");
