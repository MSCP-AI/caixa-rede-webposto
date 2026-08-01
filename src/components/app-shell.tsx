import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Alertas", icon: ShieldAlert },
  { to: "/rede", label: "Rede", icon: Building2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-paper text-ink">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-ink">
              <img
                src="/brand/ms-marca-white-transparent.png"
                alt=""
                className="h-5 w-5 object-contain"
              />
            </span>
            <div className="min-w-0 leading-none">
              <p className="font-display text-[15px] font-extrabold tracking-tight text-ink">
                Caixa Rede
              </p>
              <p className="font-mono-label mt-1 text-steel">
                Fechamento · D-1
              </p>
            </div>
          </Link>

          <nav className="flex shrink-0 items-center gap-0.5">
            {nav.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-ink text-white"
                      : "text-steel hover:bg-surface-muted hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      <footer className="no-print border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="https://msinteligencia.com.br"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center"
          >
            <div className="leading-none">
              <p className="font-mono-label text-steel">Powered by</p>
              <img
                src="/brand/ms-inteligencia-logo-black-transparent.png"
                alt="MS Inteligência"
                className="mt-1 h-3.5 w-auto max-w-[140px] object-contain object-left opacity-90 transition-opacity group-hover:opacity-100 sm:h-4 sm:max-w-[160px]"
              />
            </div>
          </a>
          <p className="hidden text-xs text-steel sm:block">
            POC · WebPosto ao vivo
          </p>
        </div>
      </footer>
    </div>
  );
}
