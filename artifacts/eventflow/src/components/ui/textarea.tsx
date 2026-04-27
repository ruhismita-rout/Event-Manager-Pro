import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "hard-interactive flex min-h-[80px] w-full rounded-none border-2 border-border bg-card px-3 py-2 text-base shadow-none placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-[3px_3px_0_hsl(var(--border))] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
