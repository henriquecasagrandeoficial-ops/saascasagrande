"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@allativa/lib/prisma";
import { requireAdmin } from "@allativa/lib/auth-guard";

export type PatternActionState = {
  error?: string;
  success?: boolean;
  message?: string;
  id?: string;
};

function revalidateAll() {
  revalidatePath("/allativa/painel/insumos");
  revalidatePath("/allativa/painel/ficha-tecnica");
}

const ITEM_KINDS = ["pedra", "metal", "corrente", "fio"] as const;

const patternItemSchema = z
  .object({
    itemKind: z.enum(ITEM_KINDS),
    quantity: z.number().positive("Quantidade deve ser maior que zero."),
    sequenceOrder: z.number().int().nonnegative().default(0),
    stoneId: z.string().optional().nullable(),
    alloyId: z.string().optional().nullable(),
    chainId: z.string().optional().nullable(),
    wireId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((item, ctx) => {
    const clear = {
      stoneId: null as string | null,
      alloyId: null as string | null,
      chainId: null as string | null,
      wireId: null as string | null,
    };
    if (item.itemKind === "pedra" && !item.stoneId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione a pedra da linha.",
        path: ["stoneId"],
      });
    }
    if (item.itemKind === "metal" && !item.alloyId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione a liga da linha.",
        path: ["alloyId"],
      });
    }
    if (item.itemKind === "corrente" && !item.chainId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione a corrente da linha.",
        path: ["chainId"],
      });
    }
    if (item.itemKind === "fio" && !item.wireId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione o fio da linha.",
        path: ["wireId"],
      });
    }
    void clear;
  });

const patternSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome da ordem."),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  items: z.array(patternItemSchema).min(1, "Adicione ao menos um insumo."),
});

function zodError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos. Verifique o formulário.";
}

function normalizeItem(item: z.infer<typeof patternItemSchema>) {
  return {
    itemKind: item.itemKind,
    quantity: item.quantity,
    sequenceOrder: item.sequenceOrder,
    notes: item.notes?.trim() || null,
    stoneId: item.itemKind === "pedra" ? item.stoneId || null : null,
    alloyId: item.itemKind === "metal" ? item.alloyId || null : null,
    chainId: item.itemKind === "corrente" ? item.chainId || null : null,
    wireId: item.itemKind === "fio" ? item.wireId || null : null,
  };
}

export async function saveSupplyPattern(
  input: unknown
): Promise<PatternActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = patternSchema.safeParse(input);
  if (!parsed.success) return { error: zodError(parsed.error) };

  const { id, name, description, isActive, items } = parsed.data;
  const normalized = items.map((item, index) => ({
    ...normalizeItem(item),
    sequenceOrder: item.sequenceOrder ?? index,
  }));

  try {
    if (id) {
      await prisma.$transaction(async (tx) => {
        await tx.supplyPattern.update({
          where: { id },
          data: {
            name,
            description: description?.trim() || null,
            isActive: isActive ?? true,
          },
        });
        await tx.supplyPatternItem.deleteMany({ where: { patternId: id } });
        await tx.supplyPatternItem.createMany({
          data: normalized.map((item) => ({
            patternId: id,
            ...item,
          })),
        });
      });
      revalidateAll();
      return {
        success: true,
        message: "Ordem atualizada com sucesso.",
        id,
      };
    }

    const created = await prisma.supplyPattern.create({
      data: {
        name,
        description: description?.trim() || null,
        isActive: isActive ?? true,
        items: {
          create: normalized,
        },
      },
      select: { id: true },
    });
    revalidateAll();
    return {
      success: true,
      message: "Ordem cadastrada com sucesso.",
      id: created.id,
    };
  } catch (error) {
    console.error("saveSupplyPattern:", error);
    return {
      error: id
        ? "Não foi possível atualizar a ordem."
        : "Não foi possível cadastrar a ordem.",
    };
  }
}

export async function deleteSupplyPattern(
  id: string
): Promise<PatternActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Sessão expirada. Faça login novamente." };
  }
  if (!id) return { error: "Ordem inválida." };

  try {
    await prisma.supplyPattern.delete({ where: { id } });
  } catch {
    return { error: "Não foi possível excluir a ordem." };
  }
  revalidateAll();
  return { success: true, message: "Ordem excluída." };
}
