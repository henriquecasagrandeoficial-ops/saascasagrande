"use client";

import { useCallback, useEffect, useState } from "react";

import { KitchenReceipt } from "@dona-lu/components/admin/kitchen-receipt";
import { canPrintOnCashierPc, handlePrint } from "@dona-lu/lib/print";
import type { KitchenReceiptData } from "@dona-lu/lib/receipt";

export function useReceiptPrint() {
  const [receiptToPrint, setReceiptToPrint] = useState<KitchenReceiptData | null>(
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

  const printReceipt = useCallback((data: KitchenReceiptData) => {
    setPrintMessage(null);

    if (!canPrintOnCashierPc()) {
      setPrintMessage("Reimpressão disponível apenas no PC do caixa.");
      return;
    }

    setReceiptToPrint(data);
  }, []);

  const ReceiptLayer =
    receiptToPrint !== null ? (
      <div className="kitchen-receipt" aria-hidden="true">
        <KitchenReceipt data={receiptToPrint} />
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
