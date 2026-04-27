import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "hard-interactive flex h-11 w-full rounded-none border-2 border-border bg-card px-3 py-1 text-base shadow-none transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:shadow-[3px_3px_0_hsl(var(--border))] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
