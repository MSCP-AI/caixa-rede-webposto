import { useEffect } from "react";
import { AlertTriangle, X, ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ShiftSummary, StationDaySummary } from "@/lib/fuel/dashboard";
import { ALERT_THRESHOLD, explainDivergence } from "@/lib/fuel/dashboard";
import { formatCurrency } from "@/lib/fuel/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  station: StationDaySummary;
  shift?: ShiftSummary | null;
  onClose: () => void;
  onSelectShift?: (caixaCodigo: number) => void;
};

export function DivergenceModal({
  station,
  shift,
  onClose,
  onSelectShift,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const focusShifts = shift
    ? [shift]
    : station.turnos.filter(
        (t) => t.hasAlert || Math.abs(t.diferenca) > 0.01,
      );
  const list = focusShifts.length ? focusShifts : station.turnos;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-fg/40 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-surface shadow-xl sm:mx-4 sm:rounded-[var(--radius-xl)]">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="danger">Divergência</Badge>
              {station.hasAlert ? (
                <Badge variant="warn">
                  Alerta {">"} {formatCurrency(ALERT_THRESHOLD)}
                </Badge>
              ) : null}
            </div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {station.fantasia}
            </h2>
            <p className="text-sm text-fg-muted">
              {[station.cidade, station.estado].filter(Boolean).join(" · ")}
              {" · Diferença do dia "}
              <span
                className={cn(
                  "font-semibold tabular",
                  station.totalDiferenca < 0 ? "text-danger" : "text-warn",
                )}
              >
                {formatCurrency(station.totalDiferenca)}
              </span>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-fg-muted">
            Quebra por forma de pagamento (apresentado × apurado).
          </p>
          <div className="space-y-4">
            {list.map((t) => {
              const hints = explainDivergence(t);
              return (
                <section
                  key={t.caixaCodigo}
                  className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.turno}</p>
                      <p className="text-xs text-fg-subtle">
                        caixa {t.caixaCodigo}
                        {t.pdvCodigo != null ? ` · PDV ${t.pdvCodigo}` : ""}
                        {" · "}
                        {t.horaAbertura ?? "—"} → {t.horaFechamento ?? "aberto"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-display text-lg font-semibold tabular",
                          Math.abs(t.diferenca) < 0.01
                            ? "text-success"
                            : t.diferenca < 0
                              ? "text-danger"
                              : "text-warn",
                        )}
                      >
                        {formatCurrency(t.diferenca)}
                      </p>
                      <p className="text-xs text-fg-muted">
                        apurado {formatCurrency(t.apurado)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {t.fechado ? (
                      <Badge variant="success">Fechado</Badge>
                    ) : (
                      <Badge variant="warn">Aberto</Badge>
                    )}
                    {t.consolidado ? (
                      <Badge variant="info">Conciliado</Badge>
                    ) : (
                      <Badge variant="muted">Não conciliado</Badge>
                    )}
                  </div>
                  {t.divergenciasForma.length > 0 ? (
                    <div className="mb-3 overflow-x-auto">
                      <table className="w-full min-w-[320px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs uppercase text-fg-subtle">
                            <th className="pb-2">Forma</th>
                            <th className="pb-2 text-right">Apresent.</th>
                            <th className="pb-2 text-right">Apurado</th>
                            <th className="pb-2 text-right">Dif.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.divergenciasForma.map((f) => (
                            <tr key={f.base} className="border-b border-border/60">
                              <td className="py-2 font-medium">
                                <span className="inline-flex items-center gap-1.5">
                                  {f.diferenca < 0 ? (
                                    <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
                                  ) : (
                                    <ArrowUpRight className="h-3.5 w-3.5 text-warn" />
                                  )}
                                  {f.forma}
                                </span>
                              </td>
                              <td className="py-2 text-right tabular text-fg-muted">
                                {formatCurrency(f.apresentado)}
                              </td>
                              <td className="py-2 text-right tabular">
                                {formatCurrency(f.apurado)}
                              </td>
                              <td
                                className={cn(
                                  "py-2 text-right tabular font-semibold",
                                  f.diferenca < 0 ? "text-danger" : "text-warn",
                                )}
                              >
                                {formatCurrency(f.diferenca)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <ul className="space-y-1.5">
                    {hints.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-fg-muted"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  {onSelectShift ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => onSelectShift(t.caixaCodigo)}
                    >
                      Ver turno completo
                    </Button>
                  ) : null}
                </section>
              );
            })}
          </div>
          {station.topFormaDivergencias.length > 0 && !shift ? (
            <section className="mt-5 rounded-[var(--radius-lg)] border border-border bg-surface-muted/50 p-4">
              <h3 className="mb-2 text-sm font-semibold">
                Resumo do dia por forma
              </h3>
              <div className="space-y-2">
                {station.topFormaDivergencias.slice(0, 6).map((f) => (
                  <div key={f.base} className="flex justify-between text-xs">
                    <span className="font-medium">{f.forma}</span>
                    <span
                      className={cn(
                        "tabular font-semibold",
                        f.diferenca < 0 ? "text-danger" : "text-warn",
                      )}
                    >
                      {formatCurrency(f.diferenca)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <footer className="border-t border-border px-5 py-3">
          <Button className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </footer>
      </div>
    </div>
  );
}
