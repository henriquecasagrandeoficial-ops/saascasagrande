"use client";

import useSWR from "swr";

import type { RequisitionCompositionItem } from "@allativa/lib/material-requisition";
import type { WorkOrderData } from "@allativa/lib/receipt";

export type PendingOrder = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  sellerName: string | null;
  createdAt: string;
  totalAmount: number;
  advancePayment: number;
  items: {
    quantity: number;
    priceAtTime: number;
    product: { title: string; compositionItems: RequisitionCompositionItem[] };
  }[];
};

type PendingResponse = {
  count: number;
  orders: PendingOrder[];
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao consultar pedidos.");
  return res.json() as Promise<T>;
};

/**
 * Contagem leve para a badge da sidebar (SWR compartilha cache entre mounts).
 */
export function usePendingOrderCount(intervalMs = 10000) {
  const { data, isLoading, mutate } = useSWR<PendingResponse>(
    "/allativa/api/admin/orders/pending?mode=count",
    fetcher,
    {
      refreshInterval: intervalMs,
      dedupingInterval: Math.min(intervalMs, 5000),
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  return {
    count: data?.count ?? 0,
    isLoading,
    refresh: () => mutate(),
  };
}

/**
 * Lista de pedidos pendentes para o painel (payload leve, sem composição).
 * SWR evita fetches paralelos duplicados entre remounts/re-renders.
 */
export function usePendingOrders(enabled = true, intervalMs = 8000) {
  const { data, isLoading, mutate } = useSWR<PendingResponse>(
    enabled ? "/allativa/api/admin/orders/pending" : null,
    fetcher,
    {
      refreshInterval: intervalMs,
      dedupingInterval: Math.min(intervalMs, 4000),
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  return {
    orders: data?.orders ?? [],
    count: data?.count ?? 0,
    isLoading: enabled ? isLoading : false,
    refresh: () => mutate(),
  };
}

/** Busca sob demanda os dados completos para impressão térmica. */
export async function fetchWorkOrderData(
  orderId: string
): Promise<WorkOrderData> {
  const res = await fetch(`/allativa/api/admin/orders/${orderId}/work-order`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Não foi possível montar a requisição de materiais.");
  }
  return res.json() as Promise<WorkOrderData>;
}
