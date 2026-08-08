import {
  calculateMaterialsForOrder,
  type MaterialRequisition,
  type RequisitionCompositionItem,
} from "@allativa/lib/material-requisition";

export type WorkOrderItem = {
  quantity: number;
  title: string;
  unitPrice: number;
};

export type WorkOrderData = {
  orderId: string;
  customerName: string;
  customerPhone?: string | null;
  sellerName?: string | null;
  createdAt: string;
  totalAmount: number;
  advancePayment: number;
  items: WorkOrderItem[];
  /** Requisição de materiais consolidada (via de encomenda do joalheiro). */
  requisition: MaterialRequisition;
};

type OrderForReceipt = {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  sellerName?: string | null;
  createdAt: Date;
  totalAmount: number;
  advancePayment?: number | null;
  items: {
    quantity: number;
    priceAtTime: number;
    productTitle?: string | null;
    product: {
      title: string;
      compositionItems?: RequisitionCompositionItem[];
    };
  }[];
};

export function toWorkOrderData(order: OrderForReceipt): WorkOrderData {
  return {
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone ?? null,
    sellerName: order.sellerName ?? null,
    createdAt: order.createdAt.toISOString(),
    totalAmount: order.totalAmount,
    // Vendas antigas não possuem sinal: tratamos como 0.
    advancePayment: order.advancePayment ?? 0,
    items: order.items.map(
      (item): WorkOrderItem => ({
        quantity: item.quantity,
        title: item.productTitle?.trim() || item.product.title,
        unitPrice: item.priceAtTime,
      })
    ),
    requisition: calculateMaterialsForOrder(
      order.items.map((item) => ({
        quantity: item.quantity,
        compositionItems: item.product.compositionItems ?? [],
      }))
    ),
  };
}
