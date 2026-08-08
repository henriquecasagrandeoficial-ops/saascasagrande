/** Detecta celular/tablet — impressão USB Epson só funciona no PC do caixa. */
export function canPrintOnCashierPc(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const isMobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return !isMobileUa;
}

/**
 * Dispara a impressão da comanda de cozinha (apenas no PC do caixa).
 *
 * Implementação atual: diálogo nativo do navegador (`window.print()`).
 *
 * Upgrade futuro — QZ Tray + Epson USB (ESC/POS):
 * 1. Instalar o QZ Tray no PC do caixa e assinar o certificado do domínio.
 * 2. Adicionar `qz-tray` e conectar: `await qz.websocket.connect()`.
 * 3. Localizar a impressora: `await qz.printers.find("EPSON")`.
 * 4. Montar comandos ESC/POS (corte, negrito, alinhamento) ou rasterizar o HTML.
 * 5. Enviar: `await qz.print({ printer, ... }, payload)`.
 * 6. Substituir `window.print()` abaixo mantendo esta assinatura.
 */
export function handlePrint(): void {
  if (!canPrintOnCashierPc()) return;
  window.print();
}
