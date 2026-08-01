import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-[var(--radius-md)] border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-steel focus:border-ink focus:ring-2 focus:ring-ink/10",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
