-- AllAtiva Joias — refatoração para o setor joalheiro.
-- Renomeia os models do domínio alimentício para o domínio de ourivesaria,
-- preservando os dados existentes (RENAME em vez de DROP/CREATE).
--
-- Observação: o build do projeto usa `prisma db push`. Este arquivo existe para
-- ambientes que apliquem migrations versionadas (`prisma migrate deploy`).

-- 1) Ingredient -> Material (+ coluna "type")
ALTER TABLE "Ingredient" RENAME TO "Material";
ALTER TABLE "Material" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'metal';

-- 2) RecipeItem -> CompositionItem (+ coluna ingredientId -> materialId)
ALTER TABLE "RecipeItem" RENAME TO "CompositionItem";
ALTER TABLE "CompositionItem" RENAME COLUMN "ingredientId" TO "materialId";

-- 3) A coluna orders."waiterName" é mantida no banco e mapeada para
--    `sellerName` no schema Prisma (@map). Nenhuma alteração de dados aqui.
