import { loadConfig, type FuelConfig } from "./config";
import {
  extractFormasPagamento,
  fetchWebPostoEmpresas,
  type WebPostoApresentadoRow,
  type WebPostoCaixaRow,
  type WebPostoEmpresa,
} from "./webposto";
import type { FormaPagamentoLinha } from "./types";

export const ALERT_THRESHOLD = 50;

export type ShiftSummary = {
  caixaCodigo: number;
  empresaCodigo: number;
  dataMovimento: string;
  turno: string;
  turnoCodigo: number | null;
  pdvCodigo: number | null;
  funcionarioCodigo: number | null;
  abertura: string | null;
  fechamento: string | null;
  horaAbertura: string | null;
  horaFechamento: string | null;
  apurado: number;
  diferenca: number;
  fechado: boolean;
  consolidado: boolean;
  bloqueado: boolean;
  formas: FormaPagamentoLinha[];
  divergenciasForma: FormaPagamentoLinha[];
  hasAlert: boolean;
};

export type StationDaySummary = {
  empresaCodigo: number;
  fantasia: string;
  razao: string | null;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  turnos: ShiftSummary[];
  turnosCount: number;
  totalApurado: number;
  totalDiferenca: number;
  fechados: number;
  abertos: number;
  consolidados: number;
  comDivergencia: number;
  alertCount: number;
  hasAlert: boolean;
  hasDivergence: boolean;
  allClosed: boolean;
  allConsolidated: boolean;
  empty: boolean;
  topFormaDivergencias: FormaPagamentoLinha[];
};

export type RedeDayDashboard = {
  date: string;
  generatedAt: string;
  threshold: number;
  stations: StationDaySummary[];
  totals: {
    postos: number;
    comMovimento: number;
    semMovimento: number;
    apurado: number;
    diferenca: number;
    turnos: number;
    fechados: number;
    abertos: number;
    consolidados: number;
    comDivergencia: number;
    alertas: number;
  };
  alerts: StationDaySummary[];
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

async function wpFetchAll(
  path: string,
  baseParams: Record<string, string | number>,
  cfg: FuelConfig,
  mode: "page" | "cursor",
): Promise<Record<string, unknown>[]> {
  const base = cfg.webpostoBaseUrl.replace(/\/$/, "");
  const all: Record<string, unknown>[] = [];

  if (mode === "page") {
    for (let pagina = 0; pagina < 50; pagina++) {
      const url = new URL(`${base}/INTEGRACAO/${path}`);
      url.searchParams.set("CHAVE", cfg.webpostoApiKey);
      for (const [k, v] of Object.entries({
        ...baseParams,
        pagina,
        tamanhoPagina: 100,
      })) {
        url.searchParams.set(k, String(v));
      }
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-API-Key": cfg.webpostoApiKey,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const batch = Array.isArray(data) ? data : data.resultados || [];
      all.push(...batch);
      if (batch.length < 100) break;
    }
  } else {
    let ultimoCodigo: string | number | null = null;
    let prev: string | number | null = null;
    for (let i = 0; i < 80; i++) {
      const url = new URL(`${base}/INTEGRACAO/${path}`);
      url.searchParams.set("CHAVE", cfg.webpostoApiKey);
      for (const [k, v] of Object.entries({
        ...baseParams,
        tamanhoPagina: 100,
      })) {
        url.searchParams.set(k, String(v));
      }
      if (ultimoCodigo != null) {
        url.searchParams.set("ultimoCodigo", String(ultimoCodigo));
      }
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-API-Key": cfg.webpostoApiKey,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const batch = Array.isArray(data) ? data : data.resultados || [];
      all.push(...batch);
      if (batch.length < 100) break;
      const next = Array.isArray(data) ? null : data.ultimoCodigo;
      if (next == null || next === "" || String(next) === String(prev)) break;
      prev = ultimoCodigo;
      ultimoCodigo = next;
    }
  }
  return all;
}

function buildShift(
  c: WebPostoCaixaRow,
  apr: WebPostoApresentadoRow | undefined,
): ShiftSummary {
  const formas = extractFormasPagamento(apr);
  const diferenca = Number(c.diferenca ?? 0);
  const divergenciasForma = formas
    .filter((f) => Math.abs(f.diferenca) > 0.01)
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

  return {
    caixaCodigo: c.caixaCodigo,
    empresaCodigo: c.empresaCodigo,
    dataMovimento: c.dataMovimento,
    turno: c.turno ?? (c.turnoCodigo != null ? `Turno ${c.turnoCodigo}` : "—"),
    turnoCodigo: c.turnoCodigo ?? null,
    pdvCodigo: c.pdvCodigo ?? null,
    funcionarioCodigo: c.funcionarioCodigo ?? null,
    abertura: c.abertura ?? null,
    fechamento: c.fechamento ?? null,
    horaAbertura: formatTime(c.abertura),
    horaFechamento: formatTime(c.fechamento),
    apurado: Number(c.apurado ?? 0),
    diferenca,
    fechado: Boolean(c.fechado),
    consolidado: Boolean(c.consolidado),
    bloqueado: Boolean(c.bloqueado),
    formas,
    divergenciasForma,
    hasAlert: Math.abs(diferenca) > ALERT_THRESHOLD,
  };
}

function mergeFormas(shifts: ShiftSummary[]): FormaPagamentoLinha[] {
  const map = new Map<string, FormaPagamentoLinha>();
  for (const s of shifts) {
    for (const f of s.formas) {
      const cur = map.get(f.base) ?? {
        base: f.base,
        forma: f.forma,
        apresentado: 0,
        apurado: 0,
        diferenca: 0,
      };
      cur.apresentado += f.apresentado;
      cur.apurado += f.apurado;
      cur.diferenca += f.diferenca;
      map.set(f.base, cur);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca),
  );
}

function stationFromEmp(
  e: WebPostoEmpresa,
  shifts: ShiftSummary[],
): StationDaySummary {
  const totalApurado = shifts.reduce((s, t) => s + t.apurado, 0);
  const totalDiferenca = shifts.reduce((s, t) => s + t.diferenca, 0);
  const fechados = shifts.filter((t) => t.fechado).length;
  const abertos = shifts.filter((t) => !t.fechado).length;
  const consolidados = shifts.filter((t) => t.consolidado).length;
  const comDivergencia = shifts.filter((t) => Math.abs(t.diferenca) > 0.01).length;
  const alertCount = shifts.filter((t) => t.hasAlert).length;
  const topFormaDivergencias = mergeFormas(shifts).filter(
    (f) => Math.abs(f.diferenca) > 0.01,
  );

  return {
    empresaCodigo: e.empresaCodigo,
    fantasia: e.fantasia || e.razao || `Empresa ${e.empresaCodigo}`,
    razao: e.razao ?? null,
    cidade: e.cidade ?? null,
    estado: e.estado ?? null,
    cnpj: e.cnpj ?? null,
    turnos: shifts.sort((a, b) => {
      const ta = a.turnoCodigo ?? 99;
      const tb = b.turnoCodigo ?? 99;
      if (ta !== tb) return ta - tb;
      return (a.abertura || "").localeCompare(b.abertura || "");
    }),
    turnosCount: shifts.length,
    totalApurado,
    totalDiferenca,
    fechados,
    abertos,
    consolidados,
    comDivergencia,
    alertCount,
    hasAlert: alertCount > 0 || Math.abs(totalDiferenca) > ALERT_THRESHOLD,
    hasDivergence: Math.abs(totalDiferenca) > 0.01 || comDivergencia > 0,
    allClosed: shifts.length > 0 && abertos === 0,
    allConsolidated: shifts.length > 0 && consolidados === shifts.length,
    empty: shifts.length === 0,
    topFormaDivergencias,
  };
}

export async function buildRedeDayDashboard(
  date: string,
  cfg?: FuelConfig,
): Promise<RedeDayDashboard> {
  const config = cfg ?? loadConfig();
  const empresas = await fetchWebPostoEmpresas(config);
  const sorted = [...empresas].sort((a, b) =>
    (a.fantasia || a.razao || "").localeCompare(
      b.fantasia || b.razao || "",
      "pt-BR",
    ),
  );

  const [caixaRaw, aprRaw] = await Promise.all([
    wpFetchAll(
      "CAIXA",
      { dataInicial: date, dataFinal: date },
      config,
      "page",
    ),
    wpFetchAll(
      "CAIXA_APRESENTADO",
      { dataInicial: date, dataFinal: date },
      config,
      "cursor",
    ),
  ]);

  const byEmp = new Map<number, WebPostoCaixaRow[]>();
  for (const row of caixaRaw as unknown as WebPostoCaixaRow[]) {
    const list = byEmp.get(row.empresaCodigo) ?? [];
    list.push(row);
    byEmp.set(row.empresaCodigo, list);
  }

  const aprMap = new Map<string, WebPostoApresentadoRow>();
  for (const row of aprRaw as unknown as WebPostoApresentadoRow[]) {
    aprMap.set(`${row.empresaCodigo}:${row.caixaCodigo}`, row);
  }

  const stations = sorted.map((e) => {
    const raw = byEmp.get(e.empresaCodigo) ?? [];
    const map = new Map<number, WebPostoCaixaRow>();
    for (const r of raw) {
      if (!map.has(r.caixaCodigo)) map.set(r.caixaCodigo, r);
    }
    const shifts = Array.from(map.values()).map((c) =>
      buildShift(c, aprMap.get(`${c.empresaCodigo}:${c.caixaCodigo}`)),
    );
    return stationFromEmp(e, shifts);
  });

  stations.sort((a, b) => {
    if (a.hasAlert !== b.hasAlert) return a.hasAlert ? -1 : 1;
    if (a.abertos !== b.abertos) return b.abertos - a.abertos;
    return Math.abs(b.totalDiferenca) - Math.abs(a.totalDiferenca);
  });

  const comMov = stations.filter((s) => !s.empty);
  const alerts = stations.filter((s) => s.hasAlert);

  return {
    date,
    generatedAt: new Date().toISOString(),
    threshold: ALERT_THRESHOLD,
    stations,
    totals: {
      postos: stations.length,
      comMovimento: comMov.length,
      semMovimento: stations.length - comMov.length,
      apurado: comMov.reduce((s, p) => s + p.totalApurado, 0),
      diferenca: comMov.reduce((s, p) => s + p.totalDiferenca, 0),
      turnos: comMov.reduce((s, p) => s + p.turnosCount, 0),
      fechados: comMov.reduce((s, p) => s + p.fechados, 0),
      abertos: comMov.reduce((s, p) => s + p.abertos, 0),
      consolidados: comMov.reduce((s, p) => s + p.consolidados, 0),
      comDivergencia: comMov.filter((p) => p.hasDivergence).length,
      alertas: alerts.length,
    },
    alerts,
  };
}

export async function fetchStationDayLive(
  empresaCodigo: number,
  date: string,
  cfg?: FuelConfig,
): Promise<StationDaySummary> {
  const config = cfg ?? loadConfig();
  const empresas = await fetchWebPostoEmpresas(config);
  const emp =
    empresas.find((e) => e.empresaCodigo === empresaCodigo) ??
    ({
      empresaCodigo,
      fantasia: `Empresa ${empresaCodigo}`,
    } as WebPostoEmpresa);

  const [caixaRaw, aprRaw] = await Promise.all([
    wpFetchAll(
      "CAIXA",
      { dataInicial: date, dataFinal: date, empresaCodigo },
      config,
      "page",
    ),
    wpFetchAll(
      "CAIXA_APRESENTADO",
      { dataInicial: date, dataFinal: date },
      config,
      "cursor",
    ),
  ]);

  const caixas = (caixaRaw as unknown as WebPostoCaixaRow[]).filter(
    (r) => Number(r.empresaCodigo) === Number(empresaCodigo),
  );
  const map = new Map<number, WebPostoCaixaRow>();
  for (const r of caixas) {
    if (!map.has(r.caixaCodigo)) map.set(r.caixaCodigo, r);
  }

  const aprMap = new Map<string, WebPostoApresentadoRow>();
  for (const row of aprRaw as unknown as WebPostoApresentadoRow[]) {
    if (Number(row.empresaCodigo) === Number(empresaCodigo)) {
      aprMap.set(`${row.empresaCodigo}:${row.caixaCodigo}`, row);
    }
  }

  const shifts = Array.from(map.values()).map((c) =>
    buildShift(c, aprMap.get(`${c.empresaCodigo}:${c.caixaCodigo}`)),
  );
  return stationFromEmp(emp, shifts);
}

function brazilTodayParts(): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  return {
    y: Number(parts.find((p) => p.type === "year")?.value),
    m: Number(parts.find((p) => p.type === "month")?.value),
    d: Number(parts.find((p) => p.type === "day")?.value),
  };
}

export function yesterdayIso(): string {
  // D-1 no fuso dos postos (Brasil)
  const { y, m, d } = brazilTodayParts();
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function daysAgoIso(days: number): string {
  const { y, m, d } = brazilTodayParts();
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function explainDivergence(shift: ShiftSummary): string[] {
  const hints: string[] = [];
  const brl = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n || 0);

  if (!shift.fechado) {
    hints.push("Turno ainda aberto — o valor apresentado pode estar incompleto.");
  }
  if (shift.fechado && !shift.consolidado) {
    hints.push("Fechado mas não consolidado — conferência final pode estar pendente.");
  }
  if (shift.divergenciasForma.length === 0 && Math.abs(shift.diferenca) > 0.01) {
    hints.push(
      "Há diferença no total do caixa sem detalhe por forma em CAIXA_APRESENTADO.",
    );
  }
  for (const f of shift.divergenciasForma.slice(0, 4)) {
    const dir =
      f.diferenca < 0
        ? "faltando no apresentado (sistema apurou mais)"
        : "apresentado maior que o apurado";
    hints.push(
      `${f.forma}: diferença de ${brl(f.diferenca)} — ${dir}. Apresentado ${brl(f.apresentado)} × apurado ${brl(f.apurado)}.`,
    );
  }
  return hints;
}


export type ShiftAlert = {
  id: string;
  empresaCodigo: number;
  fantasia: string;
  cidade: string | null;
  estado: string | null;
  date: string;
  shift: ShiftSummary;
  primaryForma: FormaPagamentoLinha | null;
  hints: string[];
  absDiff: number;
};

export type AlertFeed = {
  fromDate: string;
  toDate: string;
  generatedAt: string;
  threshold: number;
  alerts: ShiftAlert[];
  totals: {
    count: number;
    d1Count: number;
    openCount: number;
    maxAbs: number;
    sumAbs: number;
  };
};

/**
 * Shift-level alerts (default: last 7 days ending D-1, Brazil).
 * Sort: |diferença| desc → oldest date → oldest abertura.
 */
export async function buildAlertFeed(
  options?: { lookbackDays?: number; threshold?: number; cfg?: FuelConfig },
): Promise<AlertFeed> {
  const lookbackDays = options?.lookbackDays ?? 7;
  const threshold = options?.threshold ?? ALERT_THRESHOLD;
  const config = options?.cfg ?? loadConfig();
  const toDate = yesterdayIso();
  const fromDate = daysAgoIso(lookbackDays);

  const empresas = await fetchWebPostoEmpresas(config);
  const empMap = new Map(empresas.map((e) => [e.empresaCodigo, e]));

  const [caixaRaw, aprRaw] = await Promise.all([
    wpFetchAll(
      "CAIXA",
      { dataInicial: fromDate, dataFinal: toDate },
      config,
      "page",
    ),
    wpFetchAll(
      "CAIXA_APRESENTADO",
      { dataInicial: fromDate, dataFinal: toDate },
      config,
      "cursor",
    ),
  ]);

  const aprMap = new Map<string, WebPostoApresentadoRow>();
  for (const row of aprRaw as unknown as WebPostoApresentadoRow[]) {
    aprMap.set(`${row.empresaCodigo}:${row.caixaCodigo}`, row);
  }

  const caixaMap = new Map<string, WebPostoCaixaRow>();
  for (const row of caixaRaw as unknown as WebPostoCaixaRow[]) {
    if (!empMap.has(row.empresaCodigo)) continue;
    const key = `${row.empresaCodigo}:${row.caixaCodigo}`;
    if (!caixaMap.has(key)) caixaMap.set(key, row);
  }

  const alerts: ShiftAlert[] = [];
  for (const c of caixaMap.values()) {
    const shift = buildShift(
      c,
      aprMap.get(`${c.empresaCodigo}:${c.caixaCodigo}`),
    );
    const absDiff = Math.abs(shift.diferenca);
    const isAlert =
      absDiff > threshold || (!shift.fechado && shift.apurado > 0);
    if (!isAlert) continue;

    const emp = empMap.get(c.empresaCodigo);
    const date = (c.dataMovimento || "").slice(0, 10);
    const primaryForma = shift.divergenciasForma[0] ?? null;
    alerts.push({
      id: `${c.empresaCodigo}-${c.caixaCodigo}-${date}`,
      empresaCodigo: c.empresaCodigo,
      fantasia: emp?.fantasia || emp?.razao || `Empresa ${c.empresaCodigo}`,
      cidade: emp?.cidade ?? null,
      estado: emp?.estado ?? null,
      date,
      shift,
      primaryForma,
      hints: explainDivergence(shift),
      absDiff,
    });
  }

  alerts.sort((a, b) => {
    if (b.absDiff !== a.absDiff) return b.absDiff - a.absDiff;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.shift.abertura || "").localeCompare(b.shift.abertura || "");
  });

  const d1 = yesterdayIso();
  return {
    fromDate,
    toDate,
    generatedAt: new Date().toISOString(),
    threshold,
    alerts,
    totals: {
      count: alerts.length,
      d1Count: alerts.filter((a) => a.date === d1).length,
      openCount: alerts.filter((a) => !a.shift.fechado).length,
      maxAbs: alerts.reduce((m, a) => Math.max(m, a.absDiff), 0),
      sumAbs: alerts.reduce((s, a) => s + a.absDiff, 0),
    },
  };
}
