import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    usePortal?: boolean;
  }
>(({ className, sideOffset = 4, collisionPadding = 16, usePortal = false, ...props }, ref) => {
  const content = (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      avoidCollisions={true}
      sticky="always"
      className={cn(
        // Increased z-index to ensure tooltips appear above all other elements
        "z-[99999] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  );

  // Use portal rendering when requested to escape container overflow constraints
  if (usePortal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }