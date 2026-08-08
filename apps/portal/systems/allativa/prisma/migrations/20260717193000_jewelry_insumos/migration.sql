-- AllAtiva Joias — Biblioteca de Insumos (engenharia de peças).
-- Cria as tabelas de insumos específicos da ourivesaria: Pedras, Correntes,
-- Fios/Chapas e Ligas metálicas.
--
-- Observação: o build do projeto usa `prisma db push`. Este arquivo existe para
-- ambientes que apliquem migrations versionadas (`prisma migrate deploy`).

-- Pedras / gemas
CREATE TABLE "Stone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cut" TEXT NOT NULL DEFAULT 'brilhante',
    "color" TEXT NOT NULL DEFAULT 'branco',
    "sizeMm" DOUBLE PRECISION,
    "weightCt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Stone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Stone_name_idx" ON "Stone"("name");

-- Correntes
CREATE TABLE "Chain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mesh" TEXT NOT NULL DEFAULT 'veneziana',
    "material" TEXT NOT NULL DEFAULT 'Ouro 18k',
    "thicknessMm" DOUBLE PRECISION,
    "weightPerCm" DOUBLE PRECISION,
    "pricePerCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chain_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Chain_name_idx" ON "Chain"("name");

-- Fios e chapas
CREATE TABLE "Wire" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "material" TEXT NOT NULL DEFAULT 'Ouro 18k',
    "profile" TEXT NOT NULL DEFAULT 'redondo',
    "gauge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "widthMm" DOUBLE PRECISION,
    "weightPerCm" DOUBLE PRECISION,
    "pricePerCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wire_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Wire_name_idx" ON "Wire"("name");

-- Ligas metálicas
CREATE TABLE "MetalAlloy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purity" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "pureMetalName" TEXT NOT NULL DEFAULT 'Ouro 24k',
    "pureMetalPricePerG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alloyMetalName" TEXT NOT NULL DEFAULT 'Pré-liga (Prata/Cobre)',
    "alloyMetalPricePerG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MetalAlloy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MetalAlloy_name_idx" ON "MetalAlloy"("name");
