import { Plus } from "lucide-react";

import { HelpButton } from "@/components/admin/help-button";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductFormSheet } from "./product-form-sheet";
import { ProdutosTable } from "./produtos-table";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: [{ category: { order: "asc" } }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        price: true,
        costPrice: true,
        isAvailable: true,
        productCode: true,
        categoryId: true,
        category: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-800">
            Produtos
          </h1>
          <p className="mt-1 text-stone-500">
            Gerencie as peças do catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <HelpButton moduleKey="produtos" />
          {hasCategories ? (
            <ProductFormSheet
              categories={categories}
              trigger={
                <Button className="bg-brand-600 text-white hover:bg-brand-700">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              }
            />
          ) : (
            <p className="text-sm text-stone-500">
              Crie uma categoria antes de adicionar produtos.
            </p>
          )}
        </div>
      </div>

      <ProdutosTable products={products} categories={categories} />
    </div>
  );
}
