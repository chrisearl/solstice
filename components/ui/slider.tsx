"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  trackStyle,
  hideRange = false,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackStyle?: React.CSSProperties
  hideRange?: boolean
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        style={trackStyle}
        className={cn(
          "relative grow overflow-hidden rounded-full data-horizontal:w-full data-vertical:h-full data-vertical:w-1",
          hideRange ? "data-horizontal:h-2" : "bg-muted data-horizontal:h-1",
        )}
      >
        {!hideRange && (
          <SliderPrimitive.Range
            data-slot="slider-range"
            className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        )}
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "relative block size-3.5 shrink-0 rounded-full border border-[#f0b429] bg-[#f0b429] shadow-[0_0_12px_rgba(240,180,41,0.55)] ring-[#f0b429]/40 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50",
            hideRange && "outline outline-2 outline-black/70",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
