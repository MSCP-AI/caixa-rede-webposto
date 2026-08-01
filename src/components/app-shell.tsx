import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, Fuel, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Alertas", icon: ShieldAlert },
  { to: "/rede", label: "Rede", icon: Building2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <div className="no-print border-b border-border/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary text-primary-fg shadow-sm">
              <Fuel className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-semibold tracking-tight">
                Caixa Rede
              </p>
              <p className="text-[11px] text-fg-subtle">
                Alertas de fechamento · D-1
              </p>
            </div>
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
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
                    "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] px-2.5 text-sm font-medium transition-colors sm:px-3",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
