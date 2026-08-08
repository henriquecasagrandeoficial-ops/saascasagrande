import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@allativa/lib/prisma";
import { seedStonesLibrary } from "@allativa/prisma/stones-library";

export const dynamic = "force-dynamic";

/**
 * POST /api/insumos/seed-pedras
 * Popula a biblioteca base de zircônias (uma única vez).
 * Autenticação obrigatória + trava no backend se já houver pedras.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await seedStonesLibrary(prisma);

    if (result.status === "blocked") {
      return NextResponse.json(
        {
          error:
            "Ação bloqueada: Existem pedras cadastradas. O catálogo não pode ser populado novamente.",
          existingCount: result.existingCount,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      insertedCount: result.insertedCount,
      message: `${result.insertedCount} pedras inseridas com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao popular catálogo de pedras:", error);
    return NextResponse.json(
      { error: "Não foi possível popular o catálogo de pedras." },
      { status: 500 }
    );
  }
}
