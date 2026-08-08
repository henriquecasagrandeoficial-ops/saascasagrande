import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@allativa/lib/prisma";
import { toWorkOrderData } from "@allativa/lib/receipt";
import { REQUISITION_MATERIAL_SELECT } from "@allativa/lib/material-requisition";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Monta os dados de impressão (cliente + requisição de materiais) sob demanda.
 * Evita carregar a composição completa a cada ciclo de polling.
 */
export async function GET(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
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
            product: {
              select: {
                title: true,
                compositionItems: {
                  select: {
                    quantityUsed: true,
                    material: { select: REQUISITION_MATERIAL_SELECT },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(toWorkOrderData(order));
  } catch (error) {
    console.error("work-order:", error);
    return NextResponse.json(
      { error: "Erro ao montar a requisição de materiais." },
      { status: 500 }
    );
  }
}
