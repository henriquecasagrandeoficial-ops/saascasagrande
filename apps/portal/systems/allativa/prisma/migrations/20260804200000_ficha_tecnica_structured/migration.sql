-- Ficha Técnica estruturada: peso total da peça + ordem/categoria das linhas do BOM.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "totalWeightG" DOUBLE PRECISION;

ALTER TABLE "CompositionItem" ADD COLUMN IF NOT EXISTS "sequenceOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CompositionItem" ADD COLUMN IF NOT EXISTS "lineKind" TEXT NOT NULL DEFAULT 'outro';

-- Backfill lineKind a partir do tipo/attrs do Material
UPDATE "CompositionItem" AS ci
SET "lineKind" = CASE
  WHEN m.type = 'gema' THEN 'pedra'
  WHEN m."attrMesh" IS NOT NULL AND m."attrMesh" <> '' THEN 'corrente'
  WHEN m."attrProfile" IS NOT NULL AND m."attrProfile" <> '' THEN 'fio'
  WHEN m.type = 'metal' THEN 'metal'
  ELSE 'outro'
END
FROM "Material" AS m
WHERE ci."materialId" = m.id
  AND (ci."lineKind" = 'outro' OR ci."lineKind" IS NULL OR ci."lineKind" = '');

CREATE INDEX IF NOT EXISTS "CompositionItem_productId_sequenceOrder_idx"
  ON "CompositionItem"("productId", "sequenceOrder");
