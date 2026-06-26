import { CircleHelp } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface InfoHintPosition {
  left: number
  top: number
  side: 'top' | 'bottom'
}

export function InfoHint({ label, children }: { label: string; children: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<InfoHintPosition>({ left: 0, top: 0, side: 'bottom' })

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const tooltipWidth = 272
    const viewportPadding = 12
    const left = Math.min(
      window.innerWidth - tooltipWidth - viewportPadding,
      Math.max(viewportPadding, rect.left + rect.width / 2 - tooltipWidth / 2),
    )
    const preferTop = rect.top > 120
    const top = preferTop ? rect.top - 10 : rect.bottom + 10

    setPosition({ left, top, side: preferTop ? 'top' : 'bottom' })
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <CircleHelp className="size-3.5" />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-50 w-[17rem] rounded-lg bg-popover px-3 py-2 text-xs leading-5 text-popover-foreground shadow-lg ring-1 ring-border"
              style={{
                left: position.left,
                top: position.top,
                transform: position.side === 'top' ? 'translateY(-100%)' : undefined,
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
