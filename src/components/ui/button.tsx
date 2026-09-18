import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-tight transition-transform duration-[var(--motion-quick,150ms)] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-panel",
        ghost: "bg-elevated/80 text-fg border border-border",
        subtle: "bg-transparent text-muted hover:text-fg",
      },
      size: {
        lg: "h-12 min-w-44 rounded-lg px-6 text-base",
        md: "h-11 min-w-11 rounded-md px-5 text-sm",
        sm: "h-9 rounded-sm px-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
