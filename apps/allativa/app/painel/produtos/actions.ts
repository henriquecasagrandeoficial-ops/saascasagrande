"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export type ProductActionState = {
  error?: string;
  success?: boolean;
};

function revalidateAll() {
  revalidatePath("/painel/produtos");
  revalidatePath("/painel/pedidos/novo");
  revalidatePath("/");
  revalidateTag("dashboard");
}

function parsePrice(value: FormDataEntryValue | null): number {
  // Aceita "12", "12.5" ou "12,50".
  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");
  return Number(normalized);
}

/** Código interno (Ref / SKU): opcional, único quando informado. */
const productCodeSchema = z
  .string()
  .trim()
  .max(64, "Código do produto muito longo (máx. 64 caracteres).")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const productFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do produto."),
  description: z.string().trim(),
  imageUrl: z.string().trim(),
  categoryId: z.string().min(1, "Selecione uma categoria."),
  price: z.number().finite().min(0, "Informe um preço válido."),
  costPrice: z.number().finite().min(0, "Informe um custo válido."),
  isAvailable: z.boolean(),
  productCode: productCodeSchema,
});

function parseProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    price: parsePrice(formData.get("price")),
    costPrice: parsePrice(formData.get("costPrice")),
    isAvailable: formData.get("isAvailable") === "on",
    productCode: String(formData.get("productCode") ?? ""),
  });
}

function uniqueCodeError(error: unknown): string | null {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Já existe um produto com este código (Ref / SKU).";
  }
  return null;
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;

  try {
    await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl:
          data.imageUrl ||
          "https://placehold.co/800x800/034742/ffffff?text=AllAtiva",
        price: data.price,
        costPrice: data.costPrice,
        isAvailable: data.isAvailable,
        productCode: data.productCode,
        categoryId: data.categoryId,
      },
    });
  } catch (error) {
    return {
      error: uniqueCodeError(error) ?? "Não foi possível criar o produto.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Produto inválido." };

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;

  try {
    await prisma.product.update({
      where: { id, isDeleted: false },
      data: {
        title: data.title,
        description: data.description,
        imageUrl:
          data.imageUrl ||
          "https://placehold.co/800x800/034742/ffffff?text=AllAtiva",
        price: data.price,
        costPrice: data.costPrice,
        isAvailable: data.isAvailable,
        productCode: data.productCode,
        categoryId: data.categoryId,
      },
    });
  } catch (error) {
    return {
      error: uniqueCodeError(error) ?? "Não foi possível atualizar o produto.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ProductActionState> {
  await requireAdmin();

  if (!id) return { error: "Produto inválido." };

  try {
    // Soft delete: preserva FK em OrderItem e o histórico de vendas.
    // Zera o SKU para permitir reutilizar o código em um novo cadastro.
    await prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        isAvailable: false,
        productCode: null,
      },
    });
  } catch {
    return { error: "Não foi possível excluir o produto." };
  }

  revalidateAll();
  return { success: true };
}

/** Alterna rapidamente a disponibilidade a partir da tabela. */
export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<ProductActionState> {
  await requireAdmin();

  try {
    await prisma.product.update({
      where: { id, isDeleted: false },
      data: { isAvailable },
    });
  } catch {
    return { error: "Não foi possível atualizar a disponibilidade." };
  }

  revalidateAll();
  return { success: true };
}
