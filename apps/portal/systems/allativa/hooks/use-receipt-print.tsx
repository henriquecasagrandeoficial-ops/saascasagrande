"use client";

import { useCallback, useEffect, useState } from "react";

import { OrderAndRequisitionReceipt } from "@allativa/components/admin/order-requisition-receipt";
import { canPrintOnCashierPc, handlePrint } from "@allativa/lib/print";
import type { WorkOrderData } from "@allativa/lib/receipt";

export function useReceiptPrint() {
  const [receiptToPrint, setReceiptToPrint] = useState<WorkOrderData | null>(
    null
  );
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptToPrint || !canPrintOnCashierPc()) return;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handlePrint();
      });
    });

    const onAfterPrint = () => {
      setReceiptToPrint(null);
    };

    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [receiptToPrint]);

  const printReceipt = useCallback((data: WorkOrderData) => {
    setPrintMessage(null);

    if (!canPrintOnCashierPc()) {
      setPrintMessage("Reimpressão disponível apenas no PC do caixa.");
      return;
    }

    setReceiptToPrint(data);
  }, []);

  const ReceiptLayer =
    receiptToPrint !== null ? (
      <div className="work-order-receipt" aria-hidden="true">
        <OrderAndRequisitionReceipt data={receiptToPrint} />
      </div>
    ) : null;

  return {
    printReceipt,
    printMessage,
    clearPrintMessage: () => setPrintMessage(null),
    canPrint: canPrintOnCashierPc(),
    ReceiptLayer,
  };
}
