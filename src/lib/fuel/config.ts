export const DEFAULT_WEBPOSTO_BASE_URL = "https://web.qualityautomacao.com.br";
export const DEFAULT_WEBPOSTO_API_KEY =
  "e3b01217-7ebf-4143-a489-25bdf2eb6803";
export const DEFAULT_WEBPOSTO_EMPRESA_CODIGO = 55927;

/** Empresas excluídas (não entram no POC) */
export const EXCLUDED_EMPRESA_CODIGOS = new Set<number>([
  56049, // CONVENIENCIAS GARCIA LTDA.
]);

export function isExcludedEmpresa(
  empresaCodigo: number,
  fantasia?: string | null,
  razao?: string | null,
): boolean {
  if (EXCLUDED_EMPRESA_CODIGOS.has(Number(empresaCodigo))) return true;
  const name = `${fantasia || ""} ${razao || ""}`.toUpperCase();
  return (
    name.includes("CONVENIENCIAS GARCIA") ||
    name.includes("CONVENIÊNCIAS GARCIA")
  );
}

const STORAGE_KEY = "caixa_rede_config_v1";

export type FuelConfig = {
  webpostoBaseUrl: string;
  webpostoApiKey: string;
  webpostoEmpresaCodigo: number;
};

export function defaultConfig(): FuelConfig {
  return {
    webpostoBaseUrl: DEFAULT_WEBPOSTO_BASE_URL,
    webpostoApiKey: DEFAULT_WEBPOSTO_API_KEY,
    webpostoEmpresaCodigo: DEFAULT_WEBPOSTO_EMPRESA_CODIGO,
  };
}

export function loadConfig(): FuelConfig {
  const base = defaultConfig();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<FuelConfig>;
    return {
      ...base,
      ...parsed,
      webpostoBaseUrl: parsed.webpostoBaseUrl || base.webpostoBaseUrl,
      webpostoApiKey: parsed.webpostoApiKey || base.webpostoApiKey,
      webpostoEmpresaCodigo:
        Number(parsed.webpostoEmpresaCodigo) || base.webpostoEmpresaCodigo,
    };
  } catch {
    return base;
  }
}

export function saveConfig(config: FuelConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
