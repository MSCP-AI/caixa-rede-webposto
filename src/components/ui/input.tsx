import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/20",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
