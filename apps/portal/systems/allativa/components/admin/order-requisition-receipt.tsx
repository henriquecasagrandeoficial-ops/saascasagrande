import { formatDateTime, formatPhone, formatPrice } from "@allativa/lib/format";
import { formatOrderId } from "@allativa/lib/order-period";
import type { WorkOrderData } from "@allativa/lib/receipt";
import {
  formatCentimeters,
  formatGrams,
  formatStoneQty,
  type LengthRequisition,
  type MaterialRequisition,
} from "@allativa/lib/material-requisition";

interface OrderAndRequisitionReceiptProps {
  data: WorkOrderData;
}

/**
 * Recibo térmico 80mm em DUAS vias, separadas por uma linha de corte:
 *  1) Via do Cliente — comprovante de compra/encomenda.
 *  2) Via de Encomenda (Joalheiro) — Requisição de Materiais para comprar no
 *     fornecedor tudo que a produção do pedido exige (pedras, metais, fios,
 *     correntes), já agregado e somado.
 *
 * Medidas (ver também `app/globals.css` @media print):
 * - Papel: 80mm (`@page { size: 80mm auto }`) · Conteúdo: 72mm + padding lateral.
 */
export function OrderAndRequisitionReceipt({
  data,
}: OrderAndRequisitionReceiptProps) {
  const createdAt = new Date(data.createdAt);
  const hasAdvance = (data.advancePayment ?? 0) > 0;
  const remaining = Math.max(0, data.totalAmount - (data.advancePayment ?? 0));

  return (
    <div className="work-order-receipt-content box-border w-[72mm] bg-white px-[2.5mm] py-2 font-mono text-[10px] leading-tight text-black">
      {/* ───────────────── VIA DO CLIENTE ───────────────── */}
      <p className="text-center text-[12px] font-bold uppercase tracking-wide">
        AllAtiva Joias
      </p>
      <p className="mb-2 text-center text-[10px] font-semibold uppercase">
        Comprovante de Compra
      </p>

      <div className="my-2 border-t border-dashed border-black" />

      <p>
        <span className="font-bold">Pedido Nº:</span> #
        {formatOrderId(data.orderId)}
      </p>
      <p>
        <span className="font-bold">Cliente:</span> {data.customerName}
      </p>
      {data.customerPhone && (
        <p>
          <span className="font-bold">WhatsApp:</span>{" "}
          {formatPhone(data.customerPhone)}
        </p>
      )}
      {data.sellerName && (
        <p>
          <span className="font-bold">Vendedor(a):</span> {data.sellerName}
        </p>
      )}
      <p>
        <span className="font-bold">Data:</span> {formatDateTime(createdAt)}
      </p>

      <div className="my-2 border-t border-dashed border-black" />

      <p className="mb-1 font-bold uppercase">Peças</p>
      <ul className="space-y-1">
        {data.items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="shrink-0 font-bold">{item.quantity}x</span>
            <span className="min-w-0 flex-1 break-words">{item.title}</span>
          </li>
        ))}
      </ul>

      <div className="my-2 border-t border-dashed border-black" />

      {hasAdvance ? (
        <div className="space-y-0.5">
          <div className="flex justify-between gap-2">
            <span>Total da Compra:</span>
            <span className="shrink-0">{formatPrice(data.totalAmount)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Sinal Pago:</span>
            <span className="shrink-0">
              - {formatPrice(data.advancePayment)}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-2 border-t border-black pt-1 text-[11px] font-bold">
            <span>FALTA PAGAR:</span>
            <span className="shrink-0">{formatPrice(remaining)}</span>
          </div>
        </div>
      ) : (
        <p className="text-right text-[11px] font-bold">
          TOTAL: {formatPrice(data.totalAmount)}
        </p>
      )}

      <div className="my-2 border-t border-dashed border-black" />

      <p className="text-center text-[10px]">Obrigado pela preferência!</p>

      {/* ───────────────── LINHA DE CORTE ───────────────── */}
      <div className="my-3 flex items-center gap-1 text-[9px] text-black">
        <span aria-hidden>✂</span>
        <span className="flex-1 border-t border-dashed border-black" />
        <span className="uppercase tracking-wide">corte aqui</span>
        <span className="flex-1 border-t border-dashed border-black" />
      </div>

      {/* ─────────── VIA DE ENCOMENDA (JOALHEIRO) ─────────── */}
      <p className="text-center text-[12px] font-bold uppercase tracking-wide">
        Requisição de Materiais
      </p>
      <p className="mb-2 text-center text-[9px] uppercase">
        Via do Joalheiro — Lista de Compra
      </p>

      <p>
        <span className="font-bold">Pedido:</span> #{formatOrderId(data.orderId)}
      </p>
      <p>
        <span className="font-bold">Cliente:</span> {data.customerName}
      </p>
      <p>
        <span className="font-bold">Data:</span> {formatDateTime(createdAt)}
      </p>

      <div className="my-2 border-t border-dashed border-black" />

      <p className="mb-1 font-bold uppercase">Peças a produzir</p>
      <ul className="mb-2 space-y-1">
        {data.items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="shrink-0 font-bold">{item.quantity}x</span>
            <span className="min-w-0 flex-1 break-words">{item.title}</span>
          </li>
        ))}
      </ul>

      <RequisitionSections requisition={data.requisition} />

      <div className="my-2 border-t border-dashed border-black" />
      <p className="text-center text-[9px] uppercase">
        Conferir com o fornecedor antes de encomendar
      </p>
    </div>
  );
}

function RequisitionSections({
  requisition,
}: {
  requisition: MaterialRequisition;
}) {
  if (requisition.isEmpty) {
    return (
      <p className="border-t border-dashed border-black pt-2 text-center text-[9px]">
        Nenhum insumo na ficha técnica das peças.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* PEDRAS */}
      {requisition.stones.length > 0 && (
        <Section title="Pedras">
          {requisition.stones.map((s) => (
            <Row key={s.key} left={formatStoneQty(s.quantity)} right={s.label} />
          ))}
        </Section>
      )}

      {/* METAIS */}
      {requisition.metals.length > 0 && (
        <Section title="Metais">
          {requisition.metals.map((m) => (
            <Row key={m.key} left={formatGrams(m.grams)} right={m.label} />
          ))}
        </Section>
      )}

      {/* CORRENTES */}
      {requisition.chains.length > 0 && (
        <Section title="Correntes">
          {requisition.chains.map((c) => (
            <LengthRow key={c.key} line={c} />
          ))}
        </Section>
      )}

      {/* FIOS E CHAPAS */}
      {requisition.wires.length > 0 && (
        <Section title="Fios e Chapas">
          {requisition.wires.map((w) => (
            <LengthRow key={w.key} line={w} />
          ))}
        </Section>
      )}

      {/* OUTROS COMPONENTES */}
      {requisition.others.length > 0 && (
        <Section title="Componentes">
          {requisition.others.map((o) => (
            <Row
              key={o.key}
              left={`${o.quantity} ${o.unit}`}
              right={o.label}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="border-t border-black pt-1 text-[10px] font-bold uppercase">
        -- {title} --
      </p>
      <ul className="mt-1 space-y-0.5">{children}</ul>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <li className="flex items-baseline gap-2">
      {/* Quantidade à esquerda, descrição à direita (leitura na bancada). */}
      <span className="w-[16mm] shrink-0 font-bold tabular-nums">{left}</span>
      <span className="min-w-0 flex-1 break-words text-right">{right}</span>
    </li>
  );
}

function LengthRow({ line }: { line: LengthRequisition }) {
  const left = formatCentimeters(line.cm);
  const right =
    line.grams > 0
      ? `${line.label} (aprox. ${formatGrams(line.grams)})`
      : line.label;
  return <Row left={left} right={right} />;
}
