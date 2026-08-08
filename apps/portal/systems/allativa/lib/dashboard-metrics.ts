import { unstable_cache } from "next/cache";

import { prisma } from "@allativa/lib/prisma";
import { BRASILIA_TZ, getBrasiliaStartOfDay, subtractDays } from "@allativa/lib/timezone";

export type PeriodMetrics = {
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // percentual 0–100
  orderCount: number;
};

export type TopProduct = {
  productId: string;
  title: string;
  quantity: number;
};

export type CategorySales = {
  categoryName: string;
  revenue: number;
};

export type DailySales = {
  date: string; // YYYY-MM-DD (Brasília)
  label: string; // ex.: "seg 14"
  revenue: number;
};

// Linha da tabela de catálogo: todas as peças + desempenho no período.
export type CatalogProductSales = {
  productId: string;
  title: string;
  imageUrl: string;
  categoryName: string;
  quantity: number; // total vendido no período
  revenue: number; // receita gerada no período
  profit: number; // lucro gerado no período
};

export type DashboardData = {
  today: PeriodMetrics;
  week: PeriodMetrics;
  month: PeriodMetrics;
  topProducts: TopProduct[];
  categorySales: CategorySales[];
  weeklyEvolution: DailySales[];
  catalogSales: CatalogProductSales[];
};

type RawTotals = {
  revenue: number | string | null;
  cost: number | string | null;
  order_count: number | string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildMetrics(row: RawTotals | undefined): PeriodMetrics {
  const revenue = toNumber(row?.revenue);
  const cost = toNumber(row?.cost);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    margin,
    orderCount: toNumber(row?.order_count),
  };
}

/** Meia-noite do 1º dia do mês civil atual em Brasília, como Date UTC. */
function getBrasiliaStartOfMonth(reference = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(reference);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;

  return new Date(`${year}-${month}-01T03:00:00.000Z`);
}

/**
 * Agrega receita/custo/lucro no banco (SUM de price*qty e cost*qty),
 * apenas sobre pedidos COMPLETED a partir de `since`.
 */
async function getPeriodMetrics(since: Date): Promise<PeriodMetrics> {
  const rows = await prisma.$queryRaw<RawTotals[]>`
    SELECT
      COALESCE(SUM(oi."priceAtTime" * oi.quantity), 0) AS revenue,
      COALESCE(SUM(oi."costAtTime" * oi.quantity), 0) AS cost,
      COUNT(DISTINCT o.id)::int AS order_count
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi."orderId"
    WHERE o.status = 'COMPLETED'
      AND o."createdAt" >= ${since}
  `;

  return buildMetrics(rows[0]);
}

/** Top 7 produtos mais vendidos no mês civil atual (quantidade). */
async function getTopProducts(limit = 7): Promise<TopProduct[]> {
  const since = getBrasiliaStartOfMonth();

  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        status: "COMPLETED",
        createdAt: { gte: since },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      id: { in: grouped.map((row) => row.productId) },
      // Inclui soft-deleted: o dashboard mostra o título histórico se ainda existir.
    },
    select: { id: true, title: true },
  });

  const titleById = new Map(products.map((p) => [p.id, p.title]));

  return grouped.map((row) => ({
    productId: row.productId,
    title: titleById.get(row.productId) ?? "Produto removido",
    quantity: row._sum.quantity ?? 0,
  }));
}

/** Receita por categoria nos últimos 30 dias (agregado no banco). */
async function getCategorySales(since: Date): Promise<CategorySales[]> {
  type Row = { category_name: string; revenue: number | string | null };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      COALESCE(c.name, 'Sem categoria') AS category_name,
      COALESCE(SUM(oi."priceAtTime" * oi.quantity), 0) AS revenue
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi."orderId"
    INNER JOIN "Product" p ON p.id = oi."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE o.status = 'COMPLETED'
      AND o."createdAt" >= ${since}
    GROUP BY COALESCE(c.name, 'Sem categoria')
    ORDER BY revenue DESC
  `;

  return rows.map((row) => ({
    categoryName: row.category_name,
    revenue: toNumber(row.revenue),
  }));
}

/**
 * Catálogo completo com desempenho de vendas no período (a partir de `since`).
 * Usa LEFT JOIN para incluir TODAS as peças cadastradas, mesmo sem vendas,
 * e agrega `_sum` de quantidade, receita e lucro dos itens de pedidos
 * concluídos dentro do período.
 */
async function getCatalogSales(since: Date): Promise<CatalogProductSales[]> {
  type Row = {
    product_id: string;
    title: string;
    image_url: string;
    category_name: string | null;
    quantity: number | string | null;
    revenue: number | string | null;
    profit: number | string | null;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      p.id AS product_id,
      p.title AS title,
      p."imageUrl" AS image_url,
      c.name AS category_name,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0)::int AS quantity,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi."priceAtTime" * oi.quantity ELSE 0 END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN (oi."priceAtTime" - oi."costAtTime") * oi.quantity ELSE 0 END), 0) AS profit
    FROM "Product" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN order_items oi ON oi."productId" = p.id
    LEFT JOIN orders o
      ON o.id = oi."orderId"
      AND o.status = 'COMPLETED'
      AND o."createdAt" >= ${since}
    WHERE p."isDeleted" = false
    GROUP BY p.id, p.title, p."imageUrl", c.name
    ORDER BY quantity DESC, revenue DESC, p.title ASC
  `;

  return rows.map((row) => ({
    productId: row.product_id,
    title: row.title,
    imageUrl: row.image_url,
    categoryName: row.category_name ?? "Sem categoria",
    quantity: toNumber(row.quantity),
    revenue: toNumber(row.revenue),
    profit: toNumber(row.profit),
  }));
}

/** Evolução diária de receita dos últimos 7 dias (fuso Brasília). */
async function getWeeklyEvolution(since: Date): Promise<DailySales[]> {
  type Row = { day: Date; revenue: number | string | null };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      (DATE_TRUNC('day', o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${BRASILIA_TZ}))::date AS day,
      COALESCE(SUM(oi."priceAtTime" * oi.quantity), 0) AS revenue
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi."orderId"
    WHERE o.status = 'COMPLETED'
      AND o."createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;

  const byDay = new Map(
    rows.map((row) => {
      const iso =
        row.day instanceof Date
          ? row.day.toISOString().slice(0, 10)
          : String(row.day).slice(0, 10);
      return [iso, toNumber(row.revenue)] as const;
    })
  );

  const labelFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TZ,
    weekday: "short",
    day: "2-digit",
  });

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const result: DailySales[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = subtractDays(getBrasiliaStartOfDay(), i);
    const date = dayFmt.format(dayStart);
    result.push({
      date,
      label: labelFmt.format(dayStart).replace(".", ""),
      revenue: byDay.get(date) ?? 0,
    });
  }

  return result;
}

/** Carrega todas as métricas do dashboard em paralelo (com cache de 60s). */
async function loadDashboardData(): Promise<DashboardData> {
  const startOfToday = getBrasiliaStartOfDay();
  const startOfWeek = subtractDays(startOfToday, 7);
  const startOfMonth = subtractDays(startOfToday, 30);

  const [
    today,
    week,
    month,
    topProducts,
    categorySales,
    weeklyEvolution,
    catalogSales,
  ] = await Promise.all([
    getPeriodMetrics(startOfToday),
    getPeriodMetrics(startOfWeek),
    getPeriodMetrics(startOfMonth),
    getTopProducts(7),
    getCategorySales(startOfMonth),
    getWeeklyEvolution(startOfWeek),
    getCatalogSales(startOfMonth),
  ]);

  return {
    today,
    week,
    month,
    topProducts,
    categorySales,
    weeklyEvolution,
    catalogSales,
  };
}

/**
 * Cache cross-request (Next.js Data Cache) — evita martelar o banco a cada
 * navegação no admin. Invalidado via `revalidateTag("dashboard")` ao fechar
 * pedidos.
 */
export const getDashboardData = unstable_cache(
  loadDashboardData,
  ["dashboard-metrics"],
  { revalidate: 60, tags: ["dashboard"] }
);
