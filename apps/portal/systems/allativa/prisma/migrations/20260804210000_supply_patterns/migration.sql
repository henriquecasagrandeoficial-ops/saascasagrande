-- Ordens/Kits de insumos (SupplyPattern) + snapshot no BOM da peça.

CREATE TABLE IF NOT EXISTS "SupplyPattern" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplyPattern_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupplyPattern_name_idx" ON "SupplyPattern"("name");
CREATE INDEX IF NOT EXISTS "SupplyPattern_isActive_idx" ON "SupplyPattern"("isActive");

CREATE TABLE IF NOT EXISTS "SupplyPatternItem" (
  "id" TEXT NOT NULL,
  "patternId" TEXT NOT NULL,
  "itemKind" TEXT NOT NULL,
  "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
  "quantity" DOUBLE PRECISION NOT NULL,
  "stoneId" TEXT,
  "alloyId" TEXT,
  "chainId" TEXT,
  "wireId" TEXT,
  "notes" TEXT,
  CONSTRAINT "SupplyPatternItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupplyPatternItem_patternId_sequenceOrder_idx"
  ON "SupplyPatternItem"("patternId", "sequenceOrder");
CREATE INDEX IF NOT EXISTS "SupplyPatternItem_stoneId_idx" ON "SupplyPatternItem"("stoneId");
CREATE INDEX IF NOT EXISTS "SupplyPatternItem_alloyId_idx" ON "SupplyPatternItem"("alloyId");
CREATE INDEX IF NOT EXISTS "SupplyPatternItem_chainId_idx" ON "SupplyPatternItem"("chainId");
CREATE INDEX IF NOT EXISTS "SupplyPatternItem_wireId_idx" ON "SupplyPatternItem"("wireId");

ALTER TABLE "SupplyPatternItem"
  DROP CONSTRAINT IF EXISTS "SupplyPatternItem_patternId_fkey";
ALTER TABLE "SupplyPatternItem"
  ADD CONSTRAINT "SupplyPatternItem_patternId_fkey"
  FOREIGN KEY ("patternId") REFERENCES "SupplyPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplyPatternItem"
  DROP CONSTRAINT IF EXISTS "SupplyPatternItem_stoneId_fkey";
ALTER TABLE "SupplyPatternItem"
  ADD CONSTRAINT "SupplyPatternItem_stoneId_fkey"
  FOREIGN KEY ("stoneId") REFERENCES "Stone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplyPatternItem"
  DROP CONSTRAINT IF EXISTS "SupplyPatternItem_alloyId_fkey";
ALTER TABLE "SupplyPatternItem"
  ADD CONSTRAINT "SupplyPatternItem_alloyId_fkey"
  FOREIGN KEY ("alloyId") REFERENCES "MetalAlloy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplyPatternItem"
  DROP CONSTRAINT IF EXISTS "SupplyPatternItem_chainId_fkey";
ALTER TABLE "SupplyPatternItem"
  ADD CONSTRAINT "SupplyPatternItem_chainId_fkey"
  FOREIGN KEY ("chainId") REFERENCES "Chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplyPatternItem"
  DROP CONSTRAINT IF EXISTS "SupplyPatternItem_wireId_fkey";
ALTER TABLE "SupplyPatternItem"
  ADD CONSTRAINT "SupplyPatternItem_wireId_fkey"
  FOREIGN KEY ("wireId") REFERENCES "Wire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompositionItem" ADD COLUMN IF NOT EXISTS "sourcePatternId" TEXT;
ALTER TABLE "CompositionItem" ADD COLUMN IF NOT EXISTS "patternQty" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "CompositionItem_sourcePatternId_idx"
  ON "CompositionItem"("sourcePatternId");

ALTER TABLE "CompositionItem"
  DROP CONSTRAINT IF EXISTS "CompositionItem_sourcePatternId_fkey";
ALTER TABLE "CompositionItem"
  ADD CONSTRAINT "CompositionItem_sourcePatternId_fkey"
  FOREIGN KEY ("sourcePatternId") REFERENCES "SupplyPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
