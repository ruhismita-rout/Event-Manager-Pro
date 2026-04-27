import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "hard-interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-extrabold uppercase tracking-[0.08em] transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[2.5px] border-border shadow-[4px_4px_0_hsl(var(--border))] active:shadow-[2px_2px_0_hsl(var(--border))] cursor-pointer",
  {
    variants: {
      variant: {
        default:
           "bg-primary text-primary-foreground hover:bg-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive",
        outline:
          "bg-card text-foreground hover:bg-muted",
        secondary:
          "bg-secondary text-foreground hover:bg-secondary",
        ghost: "bg-transparent text-foreground border-[2px] border-border shadow-none hover:bg-[#F0E040] active:translate-x-[2px] active:translate-y-[2px]",
        link: "border-none shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        // @replit changed sizes
        default: "min-h-10 px-4 py-2",
        sm: "min-h-9 px-3 text-xs",
        lg: "min-h-11 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
