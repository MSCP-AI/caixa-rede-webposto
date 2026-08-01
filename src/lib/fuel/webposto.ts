import { loadConfig, isExcludedEmpresa, type FuelConfig } from "./config";
import type { FormaPagamentoLinha } from "./types";

type Envelope<T> = {
  resultados?: T[];
  ultimoCodigo?: number | string | null;
};

export type WebPostoEmpresa = {
  empresaCodigo: number;
  cnpj?: string | null;
  razao?: string | null;
  fantasia?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

export type WebPostoCaixaRow = {
  empresaCodigo: number;
  caixaCodigo: number;
  dataMovimento: string;
  turnoCodigo?: number | null;
  turno?: string | null;
  pdvCodigo?: number | null;
  funcionarioCodigo?: number | null;
  centroCusto?: number | null;
  codigo?: number | null;
  tipoInclusao?: string | null;
  abertura?: string | null;
  fechamento?: string | null;
  fechado?: boolean | null;
  consolidado?: boolean | null;
  bloqueado?: boolean | null;
  apurado?: number | null;
  diferenca?: number | null;
};

export type WebPostoApresentadoRow = {
  empresaCodigo: number;
  caixaCodigo: number;
  consolidado?: boolean | null;
  [key: string]: unknown;
};

export type WebPostoFuncionario = {
  empresaCodigo: number;
  funcionarioCodigo: number;
  nome?: string | null;
  funcionarioReferencia?: string | null;
  ativo?: boolean | null;
  codigo?: number | null;
};


const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  notaPrazo: "Nota a prazo",
  cheque: "Cheque",
  chequePre: "Cheque pré",
  cartao: "Cartão",
  cartaFrete: "Carta frete",
  valeCliente: "Vale cliente",
  emprestimo: "Empréstimo",
  prePag: "Pré-pagamento",
  despesa: "Despesa",
  valeFun: "Vale funcionário",
  chequePagar: "Cheque a pagar",
  transfBanc: "Transferência bancária",
  transfDeb: "Transferência débito",
  fundoCxDeb: "Fundo de caixa (débito)",
};

function baseUrl(cfg: FuelConfig) {
  return cfg.webpostoBaseUrl.replace(/\/$/, "");
}

function asRows<T>(data: Envelope<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.resultados ?? [];
}

async function wpGet<T>(
  path: string,
  params: Record<string, string | number | undefined | null>,
  cfg?: FuelConfig,
): Promise<Envelope<T> | T[]> {
  const config = cfg ?? loadConfig();
  const url = new URL(
    `${baseUrl(config)}/INTEGRACAO/${path.replace(/^\//, "")}`,
  );
  url.searchParams.set("CHAVE", config.webpostoApiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-API-Key": config.webpostoApiKey,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `WebPosto ${path} HTTP ${res.status}`);
  }
  return (await res.json()) as Envelope<T> | T[];
}

export async function fetchWebPostoEmpresas(
  cfg?: FuelConfig,
): Promise<WebPostoEmpresa[]> {
  const data = await wpGet<WebPostoEmpresa>("EMPRESAS", {}, cfg);
  return asRows(data).filter(
    (e) => !isExcludedEmpresa(e.empresaCodigo, e.fantasia, e.razao),
  );
}

/** Cache of funcionarioCodigo → nome (rede-wide; ~few hundred rows). */
let funcionarioNameCache: Map<number, string> | null = null;
let funcionarioNameCacheAt = 0;
const FUNCIONARIO_CACHE_MS = 15 * 60 * 1000;

export async function fetchWebPostoFuncionarioNames(
  cfg?: FuelConfig,
  force = false,
): Promise<Map<number, string>> {
  const now = Date.now();
  if (
    !force &&
    funcionarioNameCache &&
    now - funcionarioNameCacheAt < FUNCIONARIO_CACHE_MS
  ) {
    return funcionarioNameCache;
  }

  const config = cfg ?? loadConfig();
  const map = new Map<number, string>();
  let ultimoCodigo: string | number | null = null;
  let prev: string | number | null = null;

  for (let i = 0; i < 50; i++) {
    const params: Record<string, string | number | undefined | null> = {
      tamanhoPagina: 200,
    };
    if (ultimoCodigo != null) params.ultimoCodigo = ultimoCodigo;
    const data = await wpGet<WebPostoFuncionario>("FUNCIONARIO", params, config);
    const batch = asRows(data);
    for (const f of batch) {
      const code = Number(f.funcionarioCodigo);
      const nome = (f.nome || "").trim();
      if (code && nome) map.set(code, nome);
    }
    if (batch.length < 200) break;
    const next = Array.isArray(data) ? null : data.ultimoCodigo;
    if (next == null || next === "" || String(next) === String(prev)) break;
    prev = ultimoCodigo;
    ultimoCodigo = next;
  }

  funcionarioNameCache = map;
  funcionarioNameCacheAt = now;
  return map;
}

export function funcionarioDisplayName(
  codigo: number | null | undefined,
  names?: Map<number, string> | null,
): string | null {
  if (codigo == null) return null;
  const nome = names?.get(Number(codigo));
  return nome || null;
}


export function extractFormasPagamento(
  apr: WebPostoApresentadoRow | undefined | null,
): FormaPagamentoLinha[] {
  if (!apr) return [];
  const out: FormaPagamentoLinha[] = [];
  for (const [base, label] of Object.entries(FORMA_LABELS)) {
    const apresentado = Number(apr[`${base}Apresentado`] ?? 0);
    const apurado = Number(apr[`${base}Apurado`] ?? 0);
    const diferenca = Number(apr[`${base}Diferenca`] ?? apurado - apresentado);
    if (
      Math.abs(apresentado) < 0.005 &&
      Math.abs(apurado) < 0.005 &&
      Math.abs(diferenca) < 0.005
    ) {
      continue;
    }
    out.push({ base, forma: label, apresentado, apurado, diferenca });
  }
  return out.sort((a, b) => Math.abs(b.apurado) - Math.abs(a.apurado));
}
