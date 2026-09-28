import { useCallback, useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RowSelection } from '../types'

interface DragState {
  memberId: string
  anchorIndex: number
  headIndex: number
}

function toSelection(drag: DragState): RowSelection {
  return {
    memberId: drag.memberId,
    fromIndex: Math.min(drag.anchorIndex, drag.headIndex),
    toIndex: Math.max(drag.anchorIndex, drag.headIndex),
  }
}

export interface RowDragSelection {
  /** Pågående markering, eller `null` när inget drag är igång. */
  selection: RowSelection | null
  beginDrag: (
    memberId: string,
    dayIndex: number,
    event: ReactPointerEvent<HTMLElement>,
  ) => void
  extendDrag: (memberId: string, dayIndex: number) => void
}

/**
 * Klick-och-dra-markering över en rad.
 *
 * Markeringen bekräftas när pekaren släpps var som helst i fönstret, och
 * avbryts med Escape eller om systemet ställer in pekarhändelsen.
 */
export function useRowDragSelection(
  onCommit: (selection: RowSelection) => void,
): RowDragSelection {
  const [drag, setDrag] = useState<DragState | null>(null)

  const beginDrag = useCallback(
    (
      memberId: string,
      dayIndex: number,
      event: ReactPointerEvent<HTMLElement>,
    ) => {
      // Bara vänster musknapp; penna och finger saknar knappbegreppet.
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      // Touch får implicit pointer capture, vilket annars hindrar
      // `pointerenter` från att nå syskonrutorna under draget.
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      setDrag({ memberId, anchorIndex: dayIndex, headIndex: dayIndex })
    },
    [],
  )

  const extendDrag = useCallback((memberId: string, dayIndex: number) => {
    setDrag((current) => {
      if (current?.memberId !== memberId || current.headIndex === dayIndex) {
        return current
      }

      return { ...current, headIndex: dayIndex }
    })
  }, [])

  useEffect(() => {
    if (drag === null) {
      return
    }

    function handlePointerUp() {
      if (drag !== null) {
        onCommit(toSelection(drag))
      }

      setDrag(null)
    }

    function handleCancel() {
      setDrag(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrag(null)
      }
    }

    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handleCancel)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handleCancel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [drag, onCommit])

  return {
    selection: drag === null ? null : toSelection(drag),
    beginDrag,
    extendDrag,
  }
}
