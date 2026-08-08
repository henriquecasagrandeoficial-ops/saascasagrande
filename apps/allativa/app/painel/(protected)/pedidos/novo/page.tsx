import { HelpButton } from "@/components/admin/help-button";
import { prisma } from "@/lib/prisma";
import { PdvClient } from "./pdv-client";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const products = await prisma.product.findMany({
    where: { isAvailable: true, isDeleted: false },
    orderBy: [{ category: { order: "asc" } }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      productCode: true,
      price: true,
      imageUrl: true,
      category: { select: { name: true } },
    },
  });

  const pdvProducts = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    productCode: product.productCode,
    price: product.price,
    imageUrl: product.imageUrl,
    categoryName: product.category?.name ?? "Sem categoria",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-800">
            Novo Pedido
          </h1>
          <p className="mt-1 text-stone-500">
            Monte o pedido e finalize a venda do cliente.
          </p>
        </div>
        <HelpButton moduleKey="pdv" />
      </div>

      <PdvClient products={pdvProducts} />
    </div>
  );
}
