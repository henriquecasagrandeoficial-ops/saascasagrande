-- Performance: índices para buscas, filtros facetados e polling de pedidos.

-- Product
CREATE INDEX IF NOT EXISTS "Product_title_idx" ON "Product"("title");
CREATE INDEX IF NOT EXISTS "Product_isAvailable_idx" ON "Product"("isAvailable");
CREATE INDEX IF NOT EXISTS "Product_categoryId_title_idx" ON "Product"("categoryId", "title");

-- Material (requisição / ficha)
CREATE INDEX IF NOT EXISTS "Material_type_idx" ON "Material"("type");
CREATE INDEX IF NOT EXISTS "Material_attrCut_idx" ON "Material"("attrCut");
CREATE INDEX IF NOT EXISTS "Material_attrColor_idx" ON "Material"("attrColor");
CREATE INDEX IF NOT EXISTS "Material_attrMaterial_idx" ON "Material"("attrMaterial");
CREATE INDEX IF NOT EXISTS "Material_attrProfile_idx" ON "Material"("attrProfile");

-- Stone (filtros facetados)
CREATE INDEX IF NOT EXISTS "Stone_cut_idx" ON "Stone"("cut");
CREATE INDEX IF NOT EXISTS "Stone_color_idx" ON "Stone"("color");
CREATE INDEX IF NOT EXISTS "Stone_sizeMm_idx" ON "Stone"("sizeMm");
CREATE INDEX IF NOT EXISTS "Stone_cut_color_sizeMm_idx" ON "Stone"("cut", "color", "sizeMm");

-- Chain
CREATE INDEX IF NOT EXISTS "Chain_mesh_idx" ON "Chain"("mesh");
CREATE INDEX IF NOT EXISTS "Chain_material_idx" ON "Chain"("material");

-- Wire (filtros facetados)
CREATE INDEX IF NOT EXISTS "Wire_profile_idx" ON "Wire"("profile");
CREATE INDEX IF NOT EXISTS "Wire_material_idx" ON "Wire"("material");
CREATE INDEX IF NOT EXISTS "Wire_gauge_idx" ON "Wire"("gauge");
CREATE INDEX IF NOT EXISTS "Wire_profile_material_gauge_idx" ON "Wire"("profile", "material", "gauge");

-- Order polling (PENDING + ordenação por createdAt)
CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
