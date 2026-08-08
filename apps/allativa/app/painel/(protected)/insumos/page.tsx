import { prisma } from "@/lib/prisma";
import { HelpButton } from "@/components/admin/help-button";
import { InsumosClient } from "./insumos-client";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  // Select apenas dos campos usados nas tabelas/filtros (payload menor).
  const [stones, chains, wires, alloys, patterns] = await Promise.all([
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
        createdAt: true,
        updatedAt: true,
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
        weightPerCm: true,
        pricePerCm: true,
        createdAt: true,
        updatedAt: true,
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
        widthMm: true,
        weightPerCm: true,
        pricePerCm: true,
        alloyId: true,
        alloy: {
          select: { id: true, name: true, pricePerGram: true },
        },
        createdAt: true,
        updatedAt: true,
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
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.supplyPattern.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        items: {
          orderBy: { sequenceOrder: "asc" },
          select: {
            id: true,
            itemKind: true,
            sequenceOrder: true,
            quantity: true,
            stoneId: true,
            alloyId: true,
            chainId: true,
            wireId: true,
            stone: {
              select: {
                id: true,
                name: true,
                cut: true,
                color: true,
                sizeMm: true,
              },
            },
            alloy: { select: { id: true, name: true } },
            chain: { select: { id: true, name: true, mesh: true } },
            wire: { select: { id: true, name: true } },
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
            Biblioteca de Insumos
          </h1>
          <p className="mt-1 text-slate-500">
            Pedras, correntes, fios, ligas e ordens/kits reutilizáveis na ficha
            técnica.
          </p>
        </div>
        <HelpButton moduleKey="insumos" />
      </div>

      <InsumosClient
        stones={stones}
        chains={chains}
        wires={wires}
        alloys={alloys}
        patterns={patterns}
      />
    </div>
  );
}
