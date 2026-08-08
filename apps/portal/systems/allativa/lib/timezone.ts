export const BRASILIA_TZ = "America/Sao_Paulo";

/** Meia-noite do dia atual em Brasília, como Date UTC. */
export function getBrasiliaStartOfDay(reference = new Date()): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);

  // 00:00 em Brasília (UTC-3) = 03:00 UTC no mesmo dia civil.
  return new Date(`${dateStr}T03:00:00.000Z`);
}

/** Subtrai dias a partir de uma data. */
export function subtractDays(from: Date, days: number): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}
