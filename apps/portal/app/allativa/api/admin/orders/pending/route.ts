import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@allativa/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Short-polling de pedidos pendentes.
 *
 * Query params:
 * - `mode=count` → só `{ count }` (badge da sidebar; query leve).
 * - default → lista para o painel (SEM composição — impressão busca sob demanda).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode");

  try {
    if (mode === "count") {
      const count = await prisma.order.count({
        where: { status: "PENDING" },
      });
      return NextResponse.json({ count, orders: [] });
    }

    // Lista leve: título da peça basta para o board; a requisição de materiais
    // é carregada só no momento da impressão (/work-order).
    const orders = await prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        sellerName: true,
        createdAt: true,
        totalAmount: true,
        advancePayment: true,
        items: {
          select: {
            quantity: true,
            priceAtTime: true,
            productTitle: true,
            product: { select: { title: true } },
          },
        },
      },
    });

    const serialized = orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      sellerName: order.sellerName,
      createdAt: order.createdAt.toISOString(),
      totalAmount: order.totalAmount,
      advancePayment: order.advancePayment,
      items: order.items.map((item) => ({
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        product: {
          title: item.productTitle?.trim() || item.product.title,
          compositionItems: [] as const,
        },
      })),
    }));

    return NextResponse.json({ count: serialized.length, orders: serialized });
  } catch (error) {
    console.error("pending orders:", error);
    return NextResponse.json(
      { error: "Erro ao consultar pedidos.", count: 0, orders: [] },
      { status: 500 }
    );
  }
}
