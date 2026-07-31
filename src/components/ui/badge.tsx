import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  info: "bg-[#dce7f0] text-info",
  muted: "bg-surface-muted text-fg-muted",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        variants[variant] ?? variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
