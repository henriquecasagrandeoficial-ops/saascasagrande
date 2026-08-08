"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Category } from "@prisma/client";

import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/painel/produtos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Campos necessários para editar um produto (select enxuto da listagem). */
export type ProductFormModel = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  costPrice: number;
  isAvailable: boolean;
  productCode: string | null;
  categoryId: string | null;
};

/** Schema do formulário (espelha a validação da Server Action). */
const productFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do produto."),
  productCode: z
    .string()
    .trim()
    .max(64, "Código do produto muito longo (máx. 64 caracteres)."),
  description: z.string(),
  imageUrl: z.string(),
  price: z.string().min(1, "Informe o preço."),
  costPrice: z.string(),
  categoryId: z.string().min(1, "Selecione uma categoria."),
  isAvailable: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormSheetProps {
  product?: ProductFormModel;
  categories: Category[];
  trigger: React.ReactNode;
}

function toFormValues(
  product: ProductFormModel | undefined,
  categories: Category[]
): ProductFormValues {
  return {
    title: product?.title ?? "",
    productCode: product?.productCode ?? "",
    description: product?.description ?? "",
    imageUrl: product?.imageUrl ?? "",
    price: product?.price != null ? String(product.price) : "",
    costPrice:
      product?.costPrice != null ? String(product.costPrice) : "0",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    isAvailable: product?.isAvailable ?? true,
  };
}

export function ProductFormSheet({
  product,
  categories,
  trigger,
}: ProductFormSheetProps) {
  const isEditing = Boolean(product);
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    ProductActionState,
    FormData
  >(isEditing ? updateProduct : createProduct, {});

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product, categories),
  });

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  // Ao abrir (ou trocar o produto), repõe os valores — inclusive o productCode.
  useEffect(() => {
    if (!open) return;
    form.reset(toFormValues(product, categories));
  }, [open, product, categories, form]);

  function onValid(values: ProductFormValues) {
    const fd = new FormData();
    if (isEditing && product?.id) fd.set("id", product.id);
    fd.set("title", values.title);
    fd.set("productCode", values.productCode);
    fd.set("description", values.description);
    fd.set("imageUrl", values.imageUrl);
    fd.set("price", values.price);
    fd.set("costPrice", values.costPrice || "0");
    fd.set("categoryId", values.categoryId);
    if (values.isAvailable) fd.set("isAvailable", "on");

    formAction(fd);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Editar produto" : "Novo produto"}
          </SheetTitle>
          <SheetDescription>
            Preencha os dados da peça do catálogo.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onValid)}
          className="mt-6 space-y-4"
          noValidate
        >
          {/* Título + Código (SKU) lado a lado */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-title">Título</Label>
              <Input
                id="product-title"
                placeholder="Ex.: Anel Solitário Ouro 18k"
                aria-invalid={Boolean(form.formState.errors.title)}
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-code">
                Código do Produto (Ref / SKU)
              </Label>
              <Input
                id="product-code"
                placeholder="Ex.: AN-18K-001"
                maxLength={64}
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.productCode)}
                {...form.register("productCode")}
              />
              <p className="text-xs text-stone-500">
                Uso interno (admin e PDV). Não aparece na vitrine pública.
              </p>
              {form.formState.errors.productCode && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.productCode.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">
              Descrição (detalhes da peça)
            </Label>
            <Textarea
              id="product-description"
              placeholder="Ouro 18k, diamante 20 pontos, aro 16."
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-price">Preço de venda (R$)</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                placeholder="1200,00"
                aria-invalid={Boolean(form.formState.errors.price)}
                {...form.register("price")}
              />
              {form.formState.errors.price && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-cost">Custo (R$)</Label>
              <Input
                id="product-cost"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("costPrice")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-category">Categoria</Label>
            <Select
              value={form.watch("categoryId")}
              onValueChange={(value) =>
                form.setValue("categoryId", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="product-category">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-xs text-red-600">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Imagem do produto</Label>
            <ImageUpload
              name="imageUrl"
              defaultValue={product?.imageUrl}
              onChange={(url) => form.setValue("imageUrl", url)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
            <div>
              <Label htmlFor="product-available">Disponível</Label>
              <p className="text-xs text-stone-500">
                Produtos indisponíveis não aparecem no catálogo.
              </p>
            </div>
            <Switch
              id="product-available"
              checked={form.watch("isAvailable")}
              onCheckedChange={(checked) =>
                form.setValue("isAvailable", checked)
              }
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <SheetFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-brand-600 text-white hover:bg-brand-700"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
