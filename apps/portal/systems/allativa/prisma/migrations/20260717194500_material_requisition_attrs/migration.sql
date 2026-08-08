-- AllAtiva Joias — metadados estruturados de insumos para a Requisição de Materiais.
-- Colunas opcionais no Material, preenchidas pelos construtores da Ficha Técnica.
--
-- Observação: o build usa `prisma db push`. Este arquivo existe para ambientes
-- que apliquem migrations versionadas (`prisma migrate deploy`).

ALTER TABLE "Material" ADD COLUMN "attrCut" TEXT;
ALTER TABLE "Material" ADD COLUMN "attrColor" TEXT;
ALTER TABLE "Material" ADD COLUMN "attrSizeMm" DOUBLE PRECISION;
ALTER TABLE "Material" ADD COLUMN "attrMaterial" TEXT;
ALTER TABLE "Material" ADD COLUMN "attrMesh" TEXT;
ALTER TABLE "Material" ADD COLUMN "attrProfile" TEXT;
ALTER TABLE "Material" ADD COLUMN "attrGauge" DOUBLE PRECISION;
ALTER TABLE "Material" ADD COLUMN "weightPerCm" DOUBLE PRECISION;
ALTER TABLE "Material" ADD COLUMN "purity" DOUBLE PRECISION;
ALTER TABLE "Material" ADD COLUMN "pureMetalName" TEXT;
ALTER TABLE "Material" ADD COLUMN "alloyMetalName" TEXT;
