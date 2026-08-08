-- Código interno (Ref / SKU) do produto — uso administrativo/PDV.
-- Nullable + unique: vários produtos podem ficar sem código (NULL).

ALTER TABLE "Product" ADD COLUMN "productCode" TEXT;

CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");
