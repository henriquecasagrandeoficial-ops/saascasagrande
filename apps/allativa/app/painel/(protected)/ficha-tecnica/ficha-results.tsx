"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

import { formatPercent, formatPrice } from "@/lib/format";
import {
  buildAlerts,
  buildProjection,
  buildSimulation,
  type PricingResult,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const alertStyles = {
  danger: { box: "border-red-200 bg-red-50 text-red-800", Icon: AlertTriangle },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: Lightbulb,
  },
  info: { box: "border-sky-200 bg-sky-50 text-sky-800", Icon: Info },
  success: {
    box: "border-green-200 bg-green-50 text-green-800",
    Icon: CheckCircle2,
  },
} as const;

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

/** Formata a quantidade usada com a unidade. Ex.: "4,5 g", "12 un". */
function formatQuantity(quantity: number, unit: string): string {
  return `${quantityFormatter.format(quantity)} ${unit}`;
}

interface FichaResultsProps {
  result: PricingResult;
}

export function FichaResults({ result }: FichaResultsProps) {
  const baseCost = result.compositionCost + result.additionalFixedCost;

  const simulation = useMemo(
    () => buildSimulation(baseCost, result.additionalPercentRate),
    [baseCost, result.additionalPercentRate]
  );

  const projection = useMemo(
    () => buildProjection(result.sellingPrice, result.netProfit),
    [result.sellingPrice, result.netProfit]
  );

  const alerts = useMemo(() => buildAlerts(result), [result]);

  const additionalCostTotal =
    result.additionalFixedCost + result.additionalPercentCost;

  const kpis = [
    { label: "Custo dos Materiais", value: formatPrice(result.compositionCost) },
    { label: "Custo Adicional", value: formatPrice(additionalCostTotal) },
    { label: "Custo Total", value: formatPrice(result.totalCost) },
    {
      label: "Lucro Líquido",
      value: formatPrice(result.netProfit),
      tone: result.netProfit > 0 ? "profit" : "loss",
    },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Preço sugerido em destaque */}
      <Card className="border-brand-200 bg-brand-50">
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Preço de Venda Sugerido
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-brand-800">
              {formatPrice(result.sellingPrice)}
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-brand-600">Margem</p>
              <p className="text-lg font-semibold text-brand-800">
                {formatPercent(result.marginPercent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-600">Markup</p>
              <p className="text-lg font-semibold text-brand-800">
                {formatPercent(result.markupPercent)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold text-slate-900",
                  "tone" in kpi && kpi.tone === "profit" && "text-green-700",
                  "tone" in kpi && kpi.tone === "loss" && "text-red-600"
                )}
              >
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Composição da joia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Composição da Joia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.materialCosts.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Adicione materiais para ver o rateio de custo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">% Peça</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.materialCosts.map((item, index) => {
                  const isCostliest =
                    item.cost > 0 && item.name === result.costliestMaterial;
                  return (
                    <TableRow key={`${item.name}-${index}`}>
                      <TableCell
                        className={cn(
                          "font-medium",
                          isCostliest ? "text-red-600" : "text-slate-700"
                        )}
                      >
                        {item.name}
                        {isCostliest && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                            + caro
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-slate-500">
                        {formatQuantity(item.quantityUsed, item.unit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          isCostliest ? "text-red-600" : "text-slate-700"
                        )}
                      >
                        {formatPrice(item.cost)}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {formatPercent(item.sharePercent)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Simulação de marcação */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Simulação de preço (marcação sobre custo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Markup</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulation.map((row) => (
                <TableRow key={row.markupPercent}>
                  <TableCell className="font-medium text-slate-700">
                    {row.markupPercent}%
                  </TableCell>
                  <TableCell className="text-right font-semibold text-brand-700">
                    {formatPrice(row.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {formatPrice(row.netProfit)}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {formatPercent(row.marginPercent)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Projeção de vendas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            Projeção de vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peças</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.map((row) => (
                <TableRow key={row.units}>
                  <TableCell className="font-medium text-slate-700">
                    {row.units}
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {formatPrice(row.revenue)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold",
                      row.profit >= 0 ? "text-green-700" : "text-red-600"
                    )}
                  >
                    {formatPrice(row.profit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alertas / dicas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Inteligência financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert, index) => {
            const { box, Icon } = alertStyles[alert.level];
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                  box
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{alert.message}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
