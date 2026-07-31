import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Lock,
  Scale,
  ChevronRight,
} from "lucide-react";
import {
  ALERT_THRESHOLD,
  buildRedeDayDashboard,
  fetchStationDayLive,
  yesterdayIso,
  type RedeDayDashboard,
  type ShiftSummary,
  type StationDaySummary,
} from "@/lib/fuel/dashboard";
import {
  formatCurrency,
  formatDateLabel,
  formatShortDate,
  todayIso,
} from "@/lib/fuel/format";
import { DivergenceModal } from "@/components/caixa/divergence-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type View = "rede" | "station";

export function RedeDashboard() {
  const [date, setDate] = useState(yesterdayIso);
  const [view, setView] = useState<View>("rede");
  const [dash, setDash] = useState<RedeDayDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "alerts" | "open" | "ok">("all");
  const [station, setStation] = useState<StationDaySummary | null>(null);
  const [stationLoading, setStationLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [modalStation, setModalStation] = useState<StationDaySummary | null>(null);
  const [modalShift, setModalShift] = useState<ShiftSummary | null>(null);

  const loadRede = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      setDash(await buildRedeDayDashboard(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRede(date);
  }, [date, loadRede]);

  async function openStation(s: StationDaySummary) {
    setView("station");
    setStationLoading(true);
    setSelectedShiftId(null);
    setStation(s);
    try {
      setStation(await fetchStationDayLive(s.empresaCodigo, date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no posto");
    } finally {
      setStationLoading(false);
    }
  }

  function handleStationClick(s: StationDaySummary) {
    if (s.hasAlert || s.hasDivergence) {
      setModalStation(s);
      setModalShift(null);
    } else {
      void openStation(s);
    }
  }

  const filteredStations = useMemo(() => {
    if (!dash) return [];
    return dash.stations.filter((s) => {
      if (filter === "alerts") return s.hasAlert;
      if (filter === "open") return s.abertos > 0;
      if (filter === "ok")
        return !s.empty && !s.hasAlert && s.allClosed && !s.hasDivergence;
      return true;
    });
  }, [dash, filter]);

  const selectedShift =
    station?.turnos.find((t) => t.caixaCodigo === selectedShiftId) ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      {view === "rede" ? (
        <>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">WebPosto ao vivo</Badge>
                <Badge variant="muted">D-1 padrão</Badge>
                {dash?.totals.alertas ? (
                  <Badge variant="danger">{dash.totals.alertas} alerta(s)</Badge>
                ) : null}
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Resumo da rede
              </h1>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
              <div className="space-y-1.5">
                <Label htmlFor="date">Data do movimento</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  max={todayIso()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setView("rede");
                    setStation(null);
                  }}
                />
              </div>
              <Button variant="secondary" disabled={loading} onClick={() => loadRede(date)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar
              </Button>
            </div>
          </header>

          {error ? (
            <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {loading && !dash ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-fg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Consultando CAIXA da rede…</p>
            </div>
          ) : dash ? (
            <>
              <section className="rounded-[var(--radius-xl)] border border-border bg-surface px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                      Movimento
                    </p>
                    <p className="font-display text-xl font-semibold capitalize">
                      {formatDateLabel(dash.date)}
                    </p>
                    <p className="text-sm text-fg-muted">
                      {formatShortDate(dash.date)} · atualizado{" "}
                      {new Date(dash.generatedAt).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <Building2 className="h-4 w-4 text-primary" />
                    {dash.totals.postos} postos · {dash.totals.turnos} turnos
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi
                  icon={ShieldAlert}
                  label="Alertas"
                  value={String(dash.totals.alertas)}
                  hint={`|dif| > ${formatCurrency(ALERT_THRESHOLD)}`}
                  tone={dash.totals.alertas ? "danger" : "ok"}
                  onClick={() => setFilter((f) => (f === "alerts" ? "all" : "alerts"))}
                  active={filter === "alerts"}
                />
                <Kpi
                  icon={Scale}
                  label="Com divergência"
                  value={String(dash.totals.comDivergencia)}
                  hint={`Soma ${formatCurrency(dash.totals.diferenca)}`}
                  tone="warn"
                />
                <Kpi
                  icon={dash.totals.abertos ? Unlock : Lock}
                  label="Abertos / fechados"
                  value={`${dash.totals.abertos} / ${dash.totals.fechados}`}
                  tone={dash.totals.abertos ? "warn" : "ok"}
                  onClick={() => setFilter((f) => (f === "open" ? "all" : "open"))}
                  active={filter === "open"}
                />
                <Kpi
                  icon={CheckCircle2}
                  label="Conciliados"
                  value={String(dash.totals.consolidados)}
                  hint={`de ${dash.totals.turnos} turnos`}
                />
              </section>

              {dash.alerts.length > 0 ? (
                <Card className="border-danger/25 bg-danger-soft/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-danger" />
                      <CardTitle className="text-base">
                        Alertas — diferença {">"} {formatCurrency(ALERT_THRESHOLD)}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Clique no posto para ver a quebra por forma de pagamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    {dash.alerts.map((s) => (
                      <button
                        key={s.empresaCodigo}
                        type="button"
                        onClick={() => handleStationClick(s)}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-danger/20 bg-surface px-3 py-3 text-left hover:border-danger/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.fantasia}</p>
                          <p className="text-xs text-fg-muted">
                            {s.turnosCount} turno(s)
                            {s.abertos ? ` · ${s.abertos} aberto(s)` : " · fechado"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-display text-base font-semibold tabular",
                            s.totalDiferenca < 0 ? "text-danger" : "text-warn",
                          )}
                        >
                          {formatCurrency(s.totalDiferenca)}
                        </span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Postos da rede</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ["all", "Todos"],
                          ["alerts", "Alertas"],
                          ["open", "Abertos"],
                          ["ok", "OK"],
                        ] as const
                      ).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setFilter(k)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium",
                            filter === k
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border bg-bg-elevated text-fg-muted",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase text-fg-subtle">
                          <th className="pb-2">Posto</th>
                          <th className="pb-2 text-right">Turnos</th>
                          <th className="pb-2 text-right">Apurado</th>
                          <th className="pb-2 text-right">Diferença</th>
                          <th className="pb-2 text-right">Status</th>
                          <th className="pb-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStations.map((s) => (
                          <tr
                            key={s.empresaCodigo}
                            className={cn(
                              "border-b border-border/70",
                              s.hasAlert && "bg-danger-soft/15",
                            )}
                          >
                            <td className="py-3">
                              <button
                                type="button"
                                className="text-left font-medium hover:text-primary"
                                onClick={() => handleStationClick(s)}
                              >
                                {s.fantasia}
                              </button>
                              <p className="text-xs text-fg-subtle">
                                {[s.cidade, s.estado].filter(Boolean).join("/")}
                              </p>
                            </td>
                            <td className="py-3 text-right tabular text-fg-muted">
                              {s.empty ? "—" : s.turnosCount}
                            </td>
                            <td className="py-3 text-right tabular font-medium">
                              {s.empty ? "—" : formatCurrency(s.totalApurado)}
                            </td>
                            <td
                              className={cn(
                                "py-3 text-right tabular font-semibold",
                                s.empty
                                  ? "text-fg-subtle"
                                  : Math.abs(s.totalDiferenca) < 0.01
                                    ? "text-success"
                                    : s.totalDiferenca < 0
                                      ? "text-danger"
                                      : "text-warn",
                              )}
                            >
                              {s.empty ? "—" : formatCurrency(s.totalDiferenca)}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                {s.empty ? (
                                  <Badge variant="muted">Sem movimento</Badge>
                                ) : (
                                  <>
                                    {s.hasAlert ? (
                                      <Badge variant="danger">Alerta</Badge>
                                    ) : s.hasDivergence ? (
                                      <Badge variant="warn">Divergência</Badge>
                                    ) : (
                                      <Badge variant="success">OK</Badge>
                                    )}
                                    {s.abertos > 0 ? (
                                      <Badge variant="warn">{s.abertos} aberto</Badge>
                                    ) : (
                                      <Badge variant="success">Fechado</Badge>
                                    )}
                                    {s.consolidados > 0 ? (
                                      <Badge variant="info">{s.consolidados} conc.</Badge>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <Button variant="ghost" size="sm" onClick={() => void openStation(s)}>
                                Abrir <ChevronRight className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      ) : station ? (
        <div className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => {
                  setView("rede");
                  setStation(null);
                  setSelectedShiftId(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Voltar à rede
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {station.hasAlert ? (
                  <Badge variant="danger">Alerta</Badge>
                ) : station.hasDivergence ? (
                  <Badge variant="warn">Divergência</Badge>
                ) : (
                  <Badge variant="success">OK</Badge>
                )}
                <Badge variant="muted">{formatShortDate(date)}</Badge>
              </div>
              <h1 className="font-display text-3xl font-semibold">{station.fantasia}</h1>
              <p className="text-sm text-fg-muted">
                {[station.cidade, station.estado].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(station.hasAlert || station.hasDivergence) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalStation(station);
                    setModalShift(selectedShift);
                  }}
                >
                  <AlertTriangle className="h-4 w-4" /> Ver quebra
                </Button>
              )}
              <Button variant="secondary" onClick={() => void openStation(station)} disabled={stationLoading}>
                {stationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar
              </Button>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Mini label="Apurado do dia" value={formatCurrency(station.totalApurado)} />
            <Mini
              label="Diferença"
              value={formatCurrency(station.totalDiferenca)}
              tone={
                Math.abs(station.totalDiferenca) < 0.01
                  ? "ok"
                  : station.totalDiferenca < 0
                    ? "danger"
                    : "warn"
              }
            />
            <Mini label="Fechados / abertos" value={`${station.fechados} / ${station.abertos}`} />
            <Mini label="Conciliados" value={`${station.consolidados}/${station.turnosCount}`} />
          </section>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <CardTitle>Turnos do dia</CardTitle>
              </div>
              <CardDescription>Selecione um turno para ver as formas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stationLoading ? (
                <div className="flex items-center gap-2 py-8 text-fg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
                </div>
              ) : (
                station.turnos.map((t) => (
                  <button
                    key={t.caixaCodigo}
                    type="button"
                    onClick={() =>
                      setSelectedShiftId(
                        selectedShiftId === t.caixaCodigo ? null : t.caixaCodigo,
                      )
                    }
                    className={cn(
                      "flex w-full flex-col gap-2 rounded-[var(--radius-lg)] border px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between",
                      selectedShiftId === t.caixaCodigo
                        ? "border-primary bg-primary-soft/40"
                        : "border-border bg-bg-elevated",
                      t.hasAlert && "border-danger/40",
                    )}
                  >
                    <div>
                      <p className="font-semibold">{t.turno}</p>
                      <p className="text-xs text-fg-subtle">
                        caixa {t.caixaCodigo} · {t.horaAbertura ?? "—"} →{" "}
                        {t.horaFechamento ?? "aberto"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-sm font-medium">
                        {formatCurrency(t.apurado)}
                      </span>
                      <span
                        className={cn(
                          "tabular text-sm font-semibold",
                          Math.abs(t.diferenca) < 0.01
                            ? "text-success"
                            : t.diferenca < 0
                              ? "text-danger"
                              : "text-warn",
                        )}
                      >
                        {formatCurrency(t.diferenca)}
                      </span>
                      {t.fechado ? (
                        <Badge variant="success">Fechado</Badge>
                      ) : (
                        <Badge variant="warn">Aberto</Badge>
                      )}
                      {t.consolidado ? (
                        <Badge variant="info">Conciliado</Badge>
                      ) : (
                        <Badge variant="muted">Não conc.</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {selectedShift ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedShift.turno} — formas de pagamento</CardTitle>
                <CardDescription>CAIXA_APRESENTADO</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-fg-subtle">
                        <th className="pb-2">Forma</th>
                        <th className="pb-2 text-right">Apresentado</th>
                        <th className="pb-2 text-right">Apurado</th>
                        <th className="pb-2 text-right">Diferença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedShift.formas.map((f) => (
                        <tr
                          key={f.base}
                          className={cn(
                            "border-b border-border/70",
                            Math.abs(f.diferenca) > 0.01 && "bg-warn-soft/20",
                          )}
                        >
                          <td className="py-2.5 font-medium">{f.forma}</td>
                          <td className="py-2.5 text-right tabular text-fg-muted">
                            {formatCurrency(f.apresentado)}
                          </td>
                          <td className="py-2.5 text-right tabular">
                            {formatCurrency(f.apurado)}
                          </td>
                          <td
                            className={cn(
                              "py-2.5 text-right tabular font-semibold",
                              Math.abs(f.diferenca) < 0.01
                                ? "text-fg-muted"
                                : f.diferenca < 0
                                  ? "text-danger"
                                  : "text-warn",
                            )}
                          >
                            {formatCurrency(f.diferenca)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando posto…
        </div>
      )}

      {modalStation ? (
        <DivergenceModal
          station={modalStation}
          shift={modalShift}
          onClose={() => {
            setModalStation(null);
            setModalShift(null);
          }}
          onSelectShift={(caixaCodigo) => {
            const st = modalStation;
            setModalStation(null);
            setModalShift(null);
            void openStation(st).then(() => setSelectedShiftId(caixaCodigo));
          }}
        />
      ) : null}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "danger" | "warn";
  active?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-left shadow-sm",
    tone === "ok" && "border-success/30 bg-success-soft/40",
    tone === "danger" && "border-danger/30 bg-danger-soft/40",
    tone === "warn" && "border-warn/30 bg-warn-soft/40",
    active && "ring-2 ring-primary/30",
    onClick && "cursor-pointer hover:border-border-strong",
  );
  const inner = (
    <>
      <div className="mb-2 flex items-center gap-2 text-fg-subtle">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="font-display text-2xl font-semibold tabular">{value}</p>
      {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </>
  );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  return <div className={className}>{inner}</div>;
}

function Mini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "danger" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-sm",
        tone === "ok" && "border-success/30 bg-success-soft/30",
        tone === "danger" && "border-danger/30 bg-danger-soft/30",
        tone === "warn" && "border-warn/30 bg-warn-soft/30",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tabular">{value}</p>
    </div>
  );
}
