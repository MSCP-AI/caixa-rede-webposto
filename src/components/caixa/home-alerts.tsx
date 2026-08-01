import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  ALERT_THRESHOLD,
  buildAlertFeed,
  explainDivergence,
  fetchStationDayLive,
  yesterdayIso,
  type AlertFeed,
  type ShiftAlert,
  type StationDaySummary,
} from "@/lib/fuel/dashboard";
import {
  formatCurrency,
  formatDateLabel,
  formatShortDate,
} from "@/lib/fuel/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Scope = "d1" | "prior";

export function HomeAlerts() {
  const [scope, setScope] = useState<Scope>("d1");
  const [feed, setFeed] = useState<AlertFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShiftAlert | null>(null);
  const [station, setStation] = useState<StationDaySummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Janela ampla p/ capturar backlog antigo; home filtra D-1 vs. anteriores
      const data = await buildAlertFeed({ lookbackDays: 90 });
      setFeed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Canonical D-1 from the feed (not a second clock) so chips never mix lists
  const d1 = feed?.toDate ?? yesterdayIso();
  const visible = useMemo(() => {
    if (!feed) return [];
    if (scope === "d1") {
      return feed.alerts.filter((a) => a.date === d1);
    }
    // Anteriores = strictly before D-1 — never include D-1 rows
    return feed.alerts.filter((a) => a.date < d1);
  }, [feed, scope, d1]);

  async function openAlert(a: ShiftAlert) {
    setSelected(a);
    setDetailLoading(true);
    setStation(null);
    try {
      const live = await fetchStationDayLive(a.empresaCodigo, a.date);
      setStation(live);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir posto");
    } finally {
      setDetailLoading(false);
    }
  }

  if (selected) {
    return (
      <AlertDetail
        alert={selected}
        station={station}
        loading={detailLoading}
        onBack={() => {
          setSelected(null);
          setStation(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">WebPosto ao vivo</Badge>
          <Badge variant="muted">Checagem matinal · D-1</Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Alertas de caixa
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Onde olhar no ERP — D-1 na manhã; maiores diferenças primeiro.
              Limite {formatCurrency(ALERT_THRESHOLD)}.
            </p>
          </div>
          <Button variant="secondary" disabled={loading} onClick={() => load()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading && !feed ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-fg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Lendo caixas com divergência…</p>
        </div>
      ) : feed ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniKpi
              label="D-1"
              value={String(feed.totals.d1Count)}
              hint={formatShortDate(feed.toDate)}
              tone={feed.totals.d1Count ? "danger" : "ok"}
            />
            <MiniKpi
              label="Anteriores"
              value={String(feed.totals.priorCount)}
              hint="fora do D-1"
              tone={feed.totals.priorCount ? "warn" : "ok"}
            />
            <MiniKpi
              label="Abertos"
              value={String(feed.totals.openCount)}
              tone={feed.totals.openCount ? "warn" : "ok"}
            />
            <MiniKpi
              label="Maior |dif|"
              value={formatCurrency(feed.totals.maxAbs)}
              tone="danger"
            />
          </section>

          <div className="flex flex-wrap gap-2">
            <ScopeChip
              active={scope === "d1"}
              onClick={() => setScope("d1")}
              label={`Ontem (D-1) ${formatShortDate(feed.toDate)} · ${feed.totals.d1Count}`}
            />
            <ScopeChip
              active={scope === "prior"}
              onClick={() => setScope("prior")}
              label={`Anteriores (antes de ${formatShortDate(feed.toDate)}) · ${feed.totals.priorCount}`}
            />
          </div>

          {visible.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <ShieldAlert className="h-8 w-8 text-success" />
                <p className="font-display text-lg font-semibold">
                  Nenhum alerta neste recorte
                </p>
                <p className="max-w-sm text-sm text-fg-muted">
                  Nenhum turno com |diferença| {">"}{" "}
                  {formatCurrency(ALERT_THRESHOLD)}
                  {scope === "d1" ? " em D-1" : " em dias anteriores a D-1"}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {visible.map((a, idx) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => void openAlert(a)}
                    className={cn(
                      "flex w-full flex-col gap-2 rounded-[var(--radius-lg)] border bg-surface px-4 py-3.5 text-left shadow-sm transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between",
                      !a.shift.fechado
                        ? "border-warn/40"
                        : "border-danger/25",
                      idx === 0 && "ring-2 ring-danger/20",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold tabular text-fg-subtle">
                          #{idx + 1}
                        </span>
                        {a.date === d1 ? (
                          <Badge variant="danger">D-1</Badge>
                        ) : (
                          <Badge variant="muted">{formatShortDate(a.date)}</Badge>
                        )}
                        {!a.shift.fechado ? (
                          <Badge variant="warn">Aberto</Badge>
                        ) : (
                          <Badge variant="success">Fechado</Badge>
                        )}
                      </div>
                      <p className="truncate font-semibold">{a.fantasia}</p>
                      <p className="text-xs text-fg-muted">
                        {a.shift.turno}
                        {" · "}
                        {[a.cidade, a.estado].filter(Boolean).join("/")}
                        {" · "}
                        {a.shift.horaAbertura ?? "—"} →{" "}
                        {a.shift.horaFechamento ?? "aberto"}
                      </p>
                      {a.primaryForma ? (
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-fg-muted">
                          <Search className="h-3 w-3 text-warn" />
                          Olhar:{" "}
                          <span className="text-fg">{a.primaryForma.forma}</span>
                          {" ("}
                          {formatCurrency(a.primaryForma.diferenca)}
                          {")"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <span
                        className={cn(
                          "font-display text-xl font-semibold tabular",
                          a.shift.diferenca < 0
                            ? "text-danger"
                            : "text-warn",
                        )}
                      >
                        {formatCurrency(a.shift.diferenca)}
                      </span>
                      <span className="text-xs text-fg-subtle">
                        apurado {formatCurrency(a.shift.apurado)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-center text-xs text-fg-subtle">
            Atualizado{" "}
            {new Date(feed.generatedAt).toLocaleTimeString("pt-BR")} ·{" "}
            {formatShortDate(feed.fromDate)} → {formatShortDate(feed.toDate)}
          </p>
        </>
      ) : null}
    </div>
  );
}

function AlertDetail({
  alert,
  station,
  loading,
  onBack,
}: {
  alert: ShiftAlert;
  station: StationDaySummary | null;
  loading: boolean;
  onBack: () => void;
}) {
  const shift =
    station?.turnos.find((t) => t.caixaCodigo === alert.shift.caixaCodigo) ??
    alert.shift;
  const hints = explainDivergence(shift);
  const primary = shift.divergenciasForma[0] ?? alert.primaryForma;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Voltar aos alertas
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="danger">Prioridade</Badge>
          <Badge variant="muted">{formatShortDate(alert.date)}</Badge>
          {!shift.fechado ? (
            <Badge variant="warn">Turno aberto</Badge>
          ) : (
            <Badge variant="success">Fechado</Badge>
          )}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {alert.fantasia}
        </h1>
        <p className="text-sm text-fg-muted">
          {[alert.cidade, alert.estado].filter(Boolean).join(" · ")} ·{" "}
          {formatDateLabel(alert.date)} · {shift.turno}
        </p>
      </header>

      <Card className="border-danger/30 bg-danger-soft/25">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <CardTitle className="text-base">Onde olhar no ERP</CardTitle>
          </div>
          <CardDescription>
            Conferência sugerida para o turno{" "}
            <strong>{shift.turno}</strong> (caixa {shift.caixaCodigo}
            {shift.pdvCodigo != null ? ` · PDV ${shift.pdvCodigo}` : ""})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Diferença do turno
              </p>
              <p
                className={cn(
                  "font-display text-3xl font-semibold tabular",
                  shift.diferenca < 0 ? "text-danger" : "text-warn",
                )}
              >
                {formatCurrency(shift.diferenca)}
              </p>
              <p className="text-sm text-fg-muted">
                Apurado {formatCurrency(shift.apurado)} ·{" "}
                {shift.horaAbertura ?? "—"} → {shift.horaFechamento ?? "aberto"}
              </p>
            </div>
            {primary ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Principal origem
                </p>
                <p className="font-display text-lg font-semibold">
                  {primary.forma}
                </p>
                <p
                  className={cn(
                    "tabular font-semibold",
                    primary.diferenca < 0 ? "text-danger" : "text-warn",
                  )}
                >
                  {formatCurrency(primary.diferenca)}
                </p>
              </div>
            ) : null}
          </div>

          <ul className="space-y-2">
            {hints.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-fg-muted"
              >
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Referências para achar no ERP (WebPosto)
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[11px] text-fg-subtle">Cód. caixa</dt>
                <dd className="font-semibold tabular">{shift.caixaCodigo}</dd>
              </div>
              {shift.codigo != null && shift.codigo !== shift.caixaCodigo ? (
                <div>
                  <dt className="text-[11px] text-fg-subtle">Código</dt>
                  <dd className="font-semibold tabular">{shift.codigo}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] text-fg-subtle">Empresa</dt>
                <dd className="font-semibold tabular">{shift.empresaCodigo}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">PDV</dt>
                <dd className="font-semibold tabular">
                  {shift.pdvCodigo ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">Turno (cód.)</dt>
                <dd className="font-semibold tabular">
                  {shift.turnoCodigo ?? "—"} · {shift.turno}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">Funcionário</dt>
                <dd className="font-semibold tabular">
                  {shift.funcionarioCodigo ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">Centro de custo</dt>
                <dd className="font-semibold tabular">
                  {shift.centroCusto ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">Data movimento</dt>
                <dd className="font-semibold tabular">
                  {formatShortDate(alert.date)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">Abertura</dt>
                <dd className="font-semibold tabular text-xs">
                  {shift.abertura
                    ? new Date(shift.abertura).toLocaleString("pt-BR")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-subtle">Fechamento</dt>
                <dd className="font-semibold tabular text-xs">
                  {shift.fechamento
                    ? new Date(shift.fechamento).toLocaleString("pt-BR")
                    : "aberto"}
                </dd>
              </div>
              {shift.tipoInclusao ? (
                <div>
                  <dt className="text-[11px] text-fg-subtle">Inclusão</dt>
                  <dd className="font-semibold">{shift.tipoInclusao}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-fg-muted">
              No WebPosto: busque o caixa{" "}
              <span className="font-semibold tabular text-fg">
                {shift.caixaCodigo}
              </span>
              {shift.pdvCodigo != null ? (
                <>
                  {" "}
                  no PDV{" "}
                  <span className="font-semibold tabular text-fg">
                    {shift.pdvCodigo}
                  </span>
                </>
              ) : null}{" "}
              em {formatShortDate(alert.date)}, turno {shift.turno}.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <CardTitle>Quebra por forma de pagamento</CardTitle>
          </div>
          <CardDescription>
            Apresentado × apurado (CAIXA_APRESENTADO) — o que bate e o que não
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Atualizando do
              WebPosto…
            </div>
          ) : shift.formas.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Sem detalhe por forma neste turno.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-fg-subtle">
                    <th className="pb-2">Forma</th>
                    <th className="pb-2 text-right">Apresentado</th>
                    <th className="pb-2 text-right">Apurado</th>
                    <th className="pb-2 text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.formas.map((f) => {
                    const hot = Math.abs(f.diferenca) > 0.01;
                    return (
                      <tr
                        key={f.base}
                        className={cn(
                          "border-b border-border/70 last:border-0",
                          hot && "bg-warn-soft/30",
                        )}
                      >
                        <td className="py-2.5 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {hot ? (
                              f.diferenca < 0 ? (
                                <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 text-warn" />
                              )
                            ) : null}
                            {f.forma}
                            {primary?.base === f.base ? (
                              <Badge variant="danger">Prioridade</Badge>
                            ) : null}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular text-fg-muted">
                          {formatCurrency(f.apresentado)}
                        </td>
                        <td className="py-2.5 text-right tabular">
                          {formatCurrency(f.apurado)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right tabular font-semibold",
                            !hot
                              ? "text-fg-muted"
                              : f.diferenca < 0
                                ? "text-danger"
                                : "text-warn",
                          )}
                        >
                          {formatCurrency(f.diferenca)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {station && station.turnos.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outros turnos do dia</CardTitle>
            <CardDescription>
              Contexto no mesmo posto em {formatShortDate(alert.date)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {station.turnos
              .filter((t) => t.caixaCodigo !== shift.caixaCodigo)
              .map((t) => (
                <div
                  key={t.caixaCodigo}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {t.turno} · {t.horaAbertura ?? "—"} →{" "}
                    {t.horaFechamento ?? "aberto"}
                  </span>
                  <span
                    className={cn(
                      "tabular font-semibold",
                      Math.abs(t.diferenca) < 0.01
                        ? "text-success"
                        : t.diferenca < 0
                          ? "text-danger"
                          : "text-warn",
                    )}
                  >
                    {formatCurrency(t.diferenca)}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function MiniKpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "danger" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface p-3 shadow-sm",
        tone === "ok" && "border-success/30 bg-success-soft/30",
        tone === "danger" && "border-danger/30 bg-danger-soft/30",
        tone === "warn" && "border-warn/30 bg-warn-soft/30",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular">{value}</p>
      {hint ? <p className="text-[11px] text-fg-muted">{hint}</p> : null}
    </div>
  );
}

function ScopeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-bg-elevated text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}
