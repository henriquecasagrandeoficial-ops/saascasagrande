-- Soft delete de produtos + categorias opcionais (SetNull) + snapshot em OrderItem.
-- Permite excluir categorias/produtos sem quebrar o histórico de vendas.

-- 1) Product.isDeleted
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Product_isDeleted_idx" ON "Product"("isDeleted");
CREATE INDEX IF NOT EXISTS "Product_isDeleted_isAvailable_idx" ON "Product"("isDeleted", "isAvailable");

-- 2) categoryId opcional + onDelete SetNull
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Snapshots em order_items (backfill a partir do Product atual)
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productTitle" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productCode" TEXT;

UPDATE "order_items" AS oi
SET
  "productTitle" = COALESCE(oi."productTitle", p.title, 'Produto removido'),
  "productCode" = COALESCE(oi."productCode", p."productCode")
FROM "Product" AS p
WHERE oi."productId" = p.id;

UPDATE "order_items"
SET "productTitle" = 'Produto removido'
WHERE "productTitle" IS NULL OR "productTitle" = '';

ALTER TABLE "order_items" ALTER COLUMN "productTitle" SET NOT NULL;
