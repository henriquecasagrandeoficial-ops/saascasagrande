"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, X } from "lucide-react";
import type { Chain, MetalAlloy, Stone } from "@allativa/generated/client";

import {
  saveStone,
  saveChain,
  saveWire,
  saveAlloy,
} from "@/app/allativa/painel/insumos/actions";
import { Button } from "@allativa/components/ui/button";
import { Input } from "@allativa/components/ui/input";
import { Label } from "@allativa/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@allativa/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allativa/components/ui/select";
import { colorToHex, computeAlloy, karatToPurity } from "@allativa/lib/jewelry-math";

const CUTS = [
  "brilhante",
  "navete",
  "gota",
  "oval",
  "princesa",
  "esmeralda",
  "coração",
  "gota pêra",
  "redonda",
  "quadrada",
];
const MESHES = [
  "veneziana",
  "cartier",
  "singapura",
  "grumet",
  "português",
  "cordão baiano",
  "malha francesa",
  "elo português",
];
const PROFILES = ["redondo", "quadrado", "meia-cana", "chato/laminado"];
const MATERIALS = [
  "Ouro 18k",
  "Ouro 24k",
  "Prata 925",
  "Prata 950",
  "Ouro branco 18k",
  "Latão",
];

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Converte input HTML (string/vazio) em number | null para campos opcionais. */
function setOptionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Converte input HTML em number (0 se vazio/inválido). */
function setRequiredNumber(value: unknown): number {
  if (value === "" || value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ─── Toast leve (sem lib externa) ────────────────────────────

type ToastState = { type: "success" | "error"; message: string } | null;

function InsumoToast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  return (
    <div
      className={`fixed bottom-4 right-4 z-[70] flex max-w-sm items-start gap-2 rounded-md border px-4 py-3 text-sm shadow-lg ${
        isSuccess
          ? "border-brand-200 bg-brand-50 text-brand-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {isSuccess && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SubmitButton({
  isPending,
  isEditing,
}: {
  isPending: boolean;
  isEditing: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={isPending}
      className="bg-brand-600 text-white hover:bg-brand-700"
    >
      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      {isPending
        ? "Salvando..."
        : isEditing
          ? "Salvar alterações"
          : "Cadastrar"}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────
// Pedra
// ─────────────────────────────────────────────────────────────

const stoneFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome."),
  cut: z.string().trim().min(1),
  color: z.string().trim().min(1),
  sizeMm: z.number().nonnegative().nullable(),
  weightCt: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
});

type StoneFormValues = z.infer<typeof stoneFormSchema>;

const emptyStone = (): StoneFormValues => ({
  id: undefined,
  name: "",
  cut: "brilhante",
  color: "branco",
  sizeMm: null,
  weightCt: 0,
  unitPrice: 0,
});

function stoneToValues(stone: Stone): StoneFormValues {
  return {
    id: stone.id,
    name: stone.name,
    cut: stone.cut,
    color: stone.color,
    sizeMm: stone.sizeMm,
    weightCt: stone.weightCt,
    unitPrice: stone.unitPrice,
  };
}

export function StoneFormDialog({
  open,
  onOpenChange,
  stone,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stone?: Stone | null;
  trigger?: React.ReactNode;
}) {
  const isEditing = Boolean(stone?.id);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<StoneFormValues>({
    resolver: zodResolver(stoneFormSchema),
    defaultValues: emptyStone(),
  });

  const color = form.watch("color");

  useEffect(() => {
    if (!open) return;
    form.reset(stone ? stoneToValues(stone) : emptyStone());
    setFormError(null);
  }, [open, stone, form]);

  function onSubmit(values: StoneFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await saveStone({
        ...values,
        id: values.id || undefined,
      });
      if (result.error) {
        setFormError(result.error);
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: result.message ?? "Salvo com sucesso.",
      });
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar pedra" : "Nova pedra"}
            </DialogTitle>
            <DialogDescription>
              Cadastre gemas com lapidação, cor e peso para usar no sequenciador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stone-name">Nome</Label>
              <Input
                id="stone-name"
                {...form.register("name")}
                placeholder="Ex.: Zircônia rosa 2mm"
                autoFocus
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stone-cut">Formato / lapidação</Label>
                <Input
                  id="stone-cut"
                  list="cut-options"
                  {...form.register("cut")}
                  placeholder="brilhante"
                />
                <datalist id="cut-options">
                  {CUTS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stone-color">Cor</Label>
                <div className="relative">
                  <span
                    className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-slate-300"
                    style={{ backgroundColor: colorToHex(color || "") }}
                  />
                  <Input
                    id="stone-color"
                    className="pl-8"
                    {...form.register("color")}
                    placeholder="rosa"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stone-size">Tamanho (mm)</Label>
                <Input
                  id="stone-size"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("sizeMm", { setValueAs: setOptionalNumber })}
                  placeholder="2.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stone-weight">Peso (ct)</Label>
                <Input
                  id="stone-weight"
                  type="number"
                  step="0.001"
                  min={0}
                  {...form.register("weightCt", {
                    setValueAs: setRequiredNumber,
                  })}
                  placeholder="0.03"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stone-price">Valor unit. (R$)</Label>
                <Input
                  id="stone-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("unitPrice", {
                    setValueAs: setRequiredNumber,
                  })}
                  placeholder="1.50"
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogFooter>
              <SubmitButton isPending={isPending} isEditing={isEditing} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <InsumoToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Corrente
// ─────────────────────────────────────────────────────────────

const chainFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome."),
  mesh: z.string().trim().min(1),
  material: z.string().trim().min(1),
  thicknessMm: z.number().nonnegative().nullable(),
  weightPerCm: z.number().nonnegative().nullable(),
  pricePerCm: z.number().nonnegative(),
});

type ChainFormValues = z.infer<typeof chainFormSchema>;

const emptyChain = (): ChainFormValues => ({
  id: undefined,
  name: "",
  mesh: "veneziana",
  material: "Ouro 18k",
  thicknessMm: null,
  weightPerCm: null,
  pricePerCm: 0,
});

function chainToValues(chain: Chain): ChainFormValues {
  return {
    id: chain.id,
    name: chain.name,
    mesh: chain.mesh,
    material: chain.material,
    thicknessMm: chain.thicknessMm,
    weightPerCm: chain.weightPerCm,
    pricePerCm: chain.pricePerCm,
  };
}

export function ChainFormDialog({
  open,
  onOpenChange,
  chain,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain?: Chain | null;
  trigger?: React.ReactNode;
}) {
  const isEditing = Boolean(chain?.id);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChainFormValues>({
    resolver: zodResolver(chainFormSchema),
    defaultValues: emptyChain(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(chain ? chainToValues(chain) : emptyChain());
    setFormError(null);
  }, [open, chain, form]);

  function onSubmit(values: ChainFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await saveChain({
        ...values,
        id: values.id || undefined,
      });
      if (result.error) {
        setFormError(result.error);
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: result.message ?? "Salvo com sucesso.",
      });
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar corrente" : "Nova corrente"}
            </DialogTitle>
            <DialogDescription>
              Correntes vendidas por cm, com malha e espessura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chain-name">Nome</Label>
              <Input
                id="chain-name"
                {...form.register("name")}
                placeholder="Ex.: Corrente veneziana 1mm"
                autoFocus
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="chain-mesh">Malha / modelo</Label>
                <Input
                  id="chain-mesh"
                  list="mesh-options"
                  {...form.register("mesh")}
                  placeholder="veneziana"
                />
                <datalist id="mesh-options">
                  {MESHES.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chain-material">Material</Label>
                <Input
                  id="chain-material"
                  list="material-options"
                  {...form.register("material")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="chain-thickness">Espessura (mm)</Label>
                <Input
                  id="chain-thickness"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("thicknessMm", {
                    setValueAs: setOptionalNumber,
                  })}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chain-weight">Peso/cm (g)</Label>
                <Input
                  id="chain-weight"
                  type="number"
                  step="0.001"
                  min={0}
                  {...form.register("weightPerCm", {
                    setValueAs: setOptionalNumber,
                  })}
                  placeholder="0.15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chain-price">Valor/cm (R$)</Label>
                <Input
                  id="chain-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("pricePerCm", {
                    setValueAs: setRequiredNumber,
                  })}
                  placeholder="12.00"
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogFooter>
              <SubmitButton isPending={isPending} isEditing={isEditing} />
            </DialogFooter>
          </form>
          <MaterialsDatalist />
        </DialogContent>
      </Dialog>
      <InsumoToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Fio / chapa
// ─────────────────────────────────────────────────────────────

const wireFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome."),
  alloyId: z.string().min(1, "Selecione a liga base."),
  profile: z.string().trim().min(1),
  gauge: z.number().nonnegative(),
  widthMm: z.number().nonnegative().nullable(),
  weightPerCm: z.number().nonnegative().nullable(),
});

type WireFormValues = z.infer<typeof wireFormSchema>;

export type AlloyOptionForWire = {
  id: string;
  name: string;
  pricePerGram: number;
};

export type WireFormModel = {
  id: string;
  name: string;
  material: string;
  profile: string;
  gauge: number;
  widthMm: number | null;
  weightPerCm: number | null;
  pricePerCm: number;
  alloyId: string | null;
};

const emptyWire = (): WireFormValues => ({
  id: undefined,
  name: "",
  alloyId: "",
  profile: "redondo",
  gauge: 0,
  widthMm: null,
  weightPerCm: null,
});

function wireToValues(wire: WireFormModel): WireFormValues {
  return {
    id: wire.id,
    name: wire.name,
    alloyId: wire.alloyId ?? "",
    profile: wire.profile,
    gauge: wire.gauge,
    widthMm: wire.widthMm,
    weightPerCm: wire.weightPerCm,
  };
}

export function WireFormDialog({
  open,
  onOpenChange,
  wire,
  alloys,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wire?: WireFormModel | null;
  alloys: AlloyOptionForWire[];
  trigger?: React.ReactNode;
}) {
  const isEditing = Boolean(wire?.id);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<WireFormValues>({
    resolver: zodResolver(wireFormSchema),
    defaultValues: emptyWire(),
  });

  const profile = form.watch("profile");
  const alloyId = form.watch("alloyId");
  const weightPerCm = form.watch("weightPerCm");
  const isFlat = (profile || "").startsWith("chato");

  const selectedAlloy = useMemo(
    () => alloys.find((a) => a.id === alloyId) ?? null,
    [alloys, alloyId]
  );

  const inheritedPricePerCm = useMemo(() => {
    if (!selectedAlloy) return 0;
    return (Number(weightPerCm) || 0) * selectedAlloy.pricePerGram;
  }, [selectedAlloy, weightPerCm]);

  useEffect(() => {
    if (!open) return;
    form.reset(wire ? wireToValues(wire) : emptyWire());
    setFormError(null);
  }, [open, wire, form]);

  function onSubmit(values: WireFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await saveWire({
        ...values,
        id: values.id || undefined,
      });
      if (result.error) {
        setFormError(result.error);
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: result.message ?? "Salvo com sucesso.",
      });
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar fio/chapa" : "Novo fio/chapa"}
            </DialogTitle>
            <DialogDescription>
              O custo por grama vem da liga base — você não precisa digitar o
              valor manualmente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wire-name">Nome</Label>
              <Input
                id="wire-name"
                {...form.register("name")}
                placeholder="Ex.: Fio chato 0.45"
                autoFocus
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Liga base</Label>
              <Select
                value={alloyId || undefined}
                onValueChange={(value) =>
                  form.setValue("alloyId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a liga..." />
                </SelectTrigger>
                <SelectContent>
                  {alloys.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {BRL.format(a.pricePerGram)}/g
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.alloyId && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.alloyId.message}
                </p>
              )}
              {alloys.length === 0 && (
                <p className="text-xs text-amber-700">
                  Cadastre uma liga na aba Ligas antes de criar fios/chapas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="wire-profile">Perfil</Label>
              <Input
                id="wire-profile"
                list="profile-options"
                {...form.register("profile")}
              />
              <datalist id="profile-options">
                {PROFILES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wire-gauge">Bitola / espessura (mm)</Label>
                <Input
                  id="wire-gauge"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("gauge", { setValueAs: setRequiredNumber })}
                  placeholder="0.60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wire-width">
                  Largura (mm){" "}
                  <span className="text-xs text-slate-400">
                    {isFlat ? "(chato)" : "(opcional)"}
                  </span>
                </Label>
                <Input
                  id="wire-width"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("widthMm", {
                    setValueAs: setOptionalNumber,
                  })}
                  placeholder={isFlat ? "2.0" : "—"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wire-weight">Peso/cm (g)</Label>
              <Input
                id="wire-weight"
                type="number"
                step="0.001"
                min={0}
                {...form.register("weightPerCm", {
                  setValueAs: setOptionalNumber,
                })}
                placeholder="0.08"
              />
              <p className="text-xs text-slate-500">
                Usado para converter cm → gramas na Ficha Técnica.
              </p>
            </div>

            {selectedAlloy && (
              <div className="rounded-md border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-sm text-brand-900">
                <p className="font-medium">
                  Herança: {selectedAlloy.name} ·{" "}
                  {BRL.format(selectedAlloy.pricePerGram)}/g
                </p>
                <p className="mt-0.5 text-xs text-brand-800/80">
                  Equivalente estimado: {BRL.format(inheritedPricePerCm)}/cm
                  {weightPerCm
                    ? ` (${Number(weightPerCm).toLocaleString("pt-BR")} g/cm × ${BRL.format(selectedAlloy.pricePerGram)}/g)`
                    : " — informe o peso/cm para ver o equivalente"}
                </p>
              </div>
            )}

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogFooter>
              <SubmitButton isPending={isPending} isEditing={isEditing} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <InsumoToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Liga metálica
// ─────────────────────────────────────────────────────────────

const alloyFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome."),
  karat: z.number().positive().max(24),
  pureMetalName: z.string().trim().min(1),
  pureMetalPricePerG: z.number().nonnegative(),
  alloyMetalName: z.string().trim().min(1),
  alloyMetalPricePerG: z.number().nonnegative(),
  pricePerGram: z.number().nonnegative(),
});

type AlloyFormValues = z.infer<typeof alloyFormSchema>;

const emptyAlloy = (): AlloyFormValues => ({
  id: undefined,
  name: "",
  karat: 18,
  pureMetalName: "Ouro 24k",
  pureMetalPricePerG: 0,
  alloyMetalName: "Pré-liga (Prata/Cobre)",
  alloyMetalPricePerG: 0,
  pricePerGram: 0,
});

function alloyToValues(alloy: MetalAlloy): AlloyFormValues {
  return {
    id: alloy.id,
    name: alloy.name,
    karat: Math.round(alloy.purity * 24),
    pureMetalName: alloy.pureMetalName,
    pureMetalPricePerG: alloy.pureMetalPricePerG,
    alloyMetalName: alloy.alloyMetalName,
    alloyMetalPricePerG: alloy.alloyMetalPricePerG,
    pricePerGram: alloy.pricePerGram,
  };
}

export function AlloyFormDialog({
  open,
  onOpenChange,
  alloy,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alloy?: MetalAlloy | null;
  trigger?: React.ReactNode;
}) {
  const isEditing = Boolean(alloy?.id);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [demoWeight, setDemoWeight] = useState("1");

  const form = useForm<AlloyFormValues>({
    resolver: zodResolver(alloyFormSchema),
    defaultValues: emptyAlloy(),
  });

  const karat = form.watch("karat");
  const pureprice = form.watch("pureMetalPricePerG");
  const alloyprice = form.watch("alloyMetalPricePerG");
  const purity = karatToPurity(Number(karat) || 0);

  const result = useMemo(
    () =>
      computeAlloy({
        finalWeight: Number(demoWeight) || 0,
        purity,
        pureMetalPricePerG: Number(pureprice) || 0,
        alloyMetalPricePerG: Number(alloyprice) || 0,
      }),
    [demoWeight, purity, pureprice, alloyprice]
  );

  useEffect(() => {
    if (!open) return;
    form.reset(alloy ? alloyToValues(alloy) : emptyAlloy());
    setDemoWeight("1");
    setFormError(null);
  }, [open, alloy, form]);

  function onSubmit(values: AlloyFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await saveAlloy({
        id: values.id || undefined,
        name: values.name,
        purity: karatToPurity(Number(values.karat) || 0),
        pureMetalName: values.pureMetalName,
        pureMetalPricePerG: values.pureMetalPricePerG,
        alloyMetalName: values.alloyMetalName,
        alloyMetalPricePerG: values.alloyMetalPricePerG,
        pricePerGram: values.pricePerGram,
      });
      if (result.error) {
        setFormError(result.error);
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: result.message ?? "Salvo com sucesso.",
      });
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar liga" : "Nova liga"}</DialogTitle>
            <DialogDescription>
              Em cada 1g de liga: teor de metal nobre + o restante de pré-liga
              (ex.: 18k = 0,75g ouro fino + 0,25g pré-liga). Depois defina o
              preço oficial por grama usado no sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="alloy-name">Nome da liga</Label>
                <Input
                  id="alloy-name"
                  {...form.register("name")}
                  placeholder="Ex.: Ouro 18k (Au750)"
                  autoFocus
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="alloy-karat">
                  Teor (quilates){" "}
                  <span className="text-xs font-medium text-brand-700">
                    = {Math.round(purity * 1000)}‰
                  </span>
                </Label>
                <Input
                  id="alloy-karat"
                  type="number"
                  step="1"
                  min={1}
                  max={24}
                  {...form.register("karat", { setValueAs: setRequiredNumber })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="alloy-pure-name">Metal nobre (puro)</Label>
                <Input
                  id="alloy-pure-name"
                  {...form.register("pureMetalName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alloy-pure-price">R$/g do metal nobre</Label>
                <Input
                  id="alloy-pure-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("pureMetalPricePerG", {
                    setValueAs: setRequiredNumber,
                  })}
                  placeholder="380.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="alloy-mix-name">Pré-liga (adição)</Label>
                <Input
                  id="alloy-mix-name"
                  {...form.register("alloyMetalName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alloy-mix-price">R$/g da pré-liga</Label>
                <Input
                  id="alloy-mix-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("alloyMetalPricePerG", {
                    setValueAs: setRequiredNumber,
                  })}
                  placeholder="8.00"
                />
              </div>
            </div>

            <AlloyCalculator
              demoWeight={demoWeight}
              setDemoWeight={setDemoWeight}
              result={result}
              onUseTheoretical={() =>
                form.setValue("pricePerGram", result.costPerGram, {
                  shouldValidate: true,
                })
              }
            />

            <div className="space-y-2 rounded-md border border-[#034742]/20 bg-[#034742]/[0.04] p-3">
              <Label htmlFor="alloy-defined-price" className="text-[#034742]">
                Preço Definido por Grama (R$/g) *
              </Label>
              <Input
                id="alloy-defined-price"
                type="number"
                step="0.01"
                min={0}
                {...form.register("pricePerGram", {
                  setValueAs: setRequiredNumber,
                })}
                placeholder="380.00"
                className="bg-white font-semibold"
              />
              <p className="text-xs text-slate-600">
                Este é o valor oficial usado em fios, chapas e na Ficha Técnica.
                O cálculo da mistura acima é só referência.
              </p>
              {form.formState.errors.pricePerGram && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.pricePerGram.message}
                </p>
              )}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogFooter>
              <SubmitButton isPending={isPending} isEditing={isEditing} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <InsumoToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function AlloyCalculator({
  demoWeight,
  setDemoWeight,
  result,
  onUseTheoretical,
}: {
  demoWeight: string;
  setDemoWeight: (v: string) => void;
  result: ReturnType<typeof computeAlloy>;
  onUseTheoretical?: () => void;
}) {
  const purityPct = Math.round(result.purity * 100);
  const alloyPct = 100 - purityPct;

  return (
    <div className="rounded-md border border-brand-200 bg-brand-50/60 p-4">
      <p className="mb-3 text-xs leading-relaxed text-brand-800">
        Regra de ourivesaria: em cada <strong>1g de liga</strong> entram{" "}
        <strong>{(result.purity || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}g</strong> de
        metal nobre ({purityPct}%) +{" "}
        <strong>
          {(1 - (result.purity || 0)).toLocaleString("pt-BR", {
            maximumFractionDigits: 3,
          })}
          g
        </strong>{" "}
        de pré-liga ({alloyPct}%). Ex.: 18k = 0,75g ouro fino + 0,25g pré-liga.
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="alloy-demo" className="text-brand-800">
            Peso da liga final desejado (g)
          </Label>
          <Input
            id="alloy-demo"
            type="number"
            step="0.01"
            min={0}
            value={demoWeight}
            onChange={(e) => setDemoWeight(e.target.value)}
            className="w-40 bg-white"
          />
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-brand-700">
            Custo teórico / 1g de liga
          </p>
          <p className="font-serif text-xl font-semibold text-brand-900">
            {BRL.format(result.costPerGram)}
          </p>
          {onUseTheoretical && result.costPerGram > 0 && (
            <button
              type="button"
              onClick={onUseTheoretical}
              className="mt-1 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Usar como preço definido
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-white p-3 shadow-sm">
          <p className="text-slate-500">Metal nobre puro ({purityPct}%)</p>
          <p className="text-base font-semibold text-slate-900">
            {result.pureWeight.toLocaleString("pt-BR", {
              maximumFractionDigits: 3,
            })}{" "}
            g
          </p>
          <p className="text-xs text-slate-500">
            {BRL.format(result.pureCost)}
          </p>
        </div>
        <div className="rounded-md bg-white p-3 shadow-sm">
          <p className="text-slate-500">Pré-liga / adição ({alloyPct}%)</p>
          <p className="text-base font-semibold text-slate-900">
            {result.alloyWeight.toLocaleString("pt-BR", {
              maximumFractionDigits: 3,
            })}{" "}
            g
          </p>
          <p className="text-xs text-slate-500">
            {BRL.format(result.alloyCost)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-right text-sm text-slate-600">
        Custo total do lote:{" "}
        <span className="font-semibold text-brand-800">
          {BRL.format(result.totalCost)}
        </span>
      </p>
    </div>
  );
}

function MaterialsDatalist() {
  return (
    <datalist id="material-options">
      {MATERIALS.map((m) => (
        <option key={m} value={m} />
      ))}
    </datalist>
  );
}
