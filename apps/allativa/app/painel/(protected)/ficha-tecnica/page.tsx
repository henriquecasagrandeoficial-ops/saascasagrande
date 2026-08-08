import { prisma } from "@/lib/prisma";
import { HelpButton } from "@/components/admin/help-button";
import { FichaTecnicaForm } from "./ficha-tecnica-form";

export const dynamic = "force-dynamic";

export default async function FichaTecnicaPage() {
  const MATERIAL_ATTR_SELECT = {
    attrCut: true,
    attrColor: true,
    attrSizeMm: true,
    attrMaterial: true,
    attrMesh: true,
    attrProfile: true,
    attrGauge: true,
    weightPerCm: true,
    purity: true,
    pureMetalName: true,
    alloyMetalName: true,
  } as const;

  const [products, categories, stones, chains, wires, alloys, patterns] =
    await Promise.all([
      prisma.product.findMany({
        where: { isDeleted: false },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          productCode: true,
          totalWeightG: true,
          price: true,
          isAvailable: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
          pricingStrategy: true,
          pricingValue: true,
          compositionItems: {
            orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }],
            select: {
              quantityUsed: true,
              sequenceOrder: true,
              lineKind: true,
              sourcePatternId: true,
              patternQty: true,
              sourcePattern: { select: { id: true, name: true } },
              material: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  purchasePrice: true,
                  purchaseQuantity: true,
                  unit: true,
                  ...MATERIAL_ATTR_SELECT,
                },
              },
            },
          },
        },
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.stone.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          cut: true,
          color: true,
          sizeMm: true,
          weightCt: true,
          unitPrice: true,
        },
      }),
      prisma.chain.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          mesh: true,
          material: true,
          thicknessMm: true,
          pricePerCm: true,
          weightPerCm: true,
        },
      }),
      prisma.wire.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          material: true,
          profile: true,
          gauge: true,
          pricePerCm: true,
          weightPerCm: true,
          alloyId: true,
          alloy: {
            select: {
              id: true,
              name: true,
              pricePerGram: true,
            },
          },
        },
      }),
      prisma.metalAlloy.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          purity: true,
          pureMetalName: true,
          pureMetalPricePerG: true,
          alloyMetalName: true,
          alloyMetalPricePerG: true,
          pricePerGram: true,
        },
      }),
      prisma.supplyPattern.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          items: {
            orderBy: { sequenceOrder: "asc" },
            select: {
              id: true,
              itemKind: true,
              sequenceOrder: true,
              quantity: true,
              stone: {
                select: {
                  id: true,
                  name: true,
                  cut: true,
                  color: true,
                  sizeMm: true,
                  unitPrice: true,
                },
              },
              alloy: {
                select: {
                  id: true,
                  name: true,
                  purity: true,
                  pureMetalName: true,
                  alloyMetalName: true,
                  pricePerGram: true,
                },
              },
              chain: {
                select: {
                  id: true,
                  name: true,
                  mesh: true,
                  material: true,
                  thicknessMm: true,
                  pricePerCm: true,
                  weightPerCm: true,
                },
              },
              wire: {
                select: {
                  id: true,
                  name: true,
                  material: true,
                  profile: true,
                  gauge: true,
                  pricePerCm: true,
                  weightPerCm: true,
                  alloy: {
                    select: { id: true, name: true, pricePerGram: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">
            Ficha Técnica
          </h1>
          <p className="mt-1 text-slate-500">
            Avulsos ou ordens/kits — expansão automática e precificação em tempo
            real.
          </p>
        </div>
        <HelpButton moduleKey="ficha-tecnica" />
      </div>

      <FichaTecnicaForm
        products={products}
        categories={categories}
        stones={stones}
        chains={chains}
        wires={wires}
        alloys={alloys}
        patterns={patterns}
      />
    </div>
  );
}
