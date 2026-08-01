import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-fg hover:bg-accent",
        secondary:
          "bg-white text-ink border border-line hover:bg-surface-muted",
        ghost: "text-steel hover:bg-surface-muted hover:text-ink",
        danger: "bg-danger text-white hover:opacity-90",
        outline:
          "border border-border-strong bg-transparent text-ink hover:bg-surface-muted",
        ink: "bg-ink text-white hover:bg-n-800",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-sm",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
