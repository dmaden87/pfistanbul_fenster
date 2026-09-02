import { useEffect, useState } from 'react'
import type { OpeningDirection } from '../../types'
import './PlisseeVisual.css'

interface PlisseeVisualProps {
  direction: OpeningDirection
  /** Seitenverhältnis der Öffnung, damit die Skizze zum echten Format passt. */
  ratio: number
  /** Versetzt den Takt, damit nicht alle Skizzen gleichzeitig laufen. */
  delayMs?: number
}

/**
 * Kleine Skizze im Stil der Startseiten-Grafik: zeigt, in welche Richtung sich
 * das Plissee öffnet. Der Takt läuft langsam von zu nach offen und zurück.
 * Bei "mitte" sind es zwei Netze, die sich beim Schliessen in der Mitte treffen.
 */
export function PlisseeVisual({ direction, ratio, delayMs = 0 }: PlisseeVisualProps) {
  const [closed, setClosed] = useState(true)

  useEffect(() => {
    let interval: number | undefined
    const start = window.setTimeout(() => {
      setClosed((value) => !value)
      interval = window.setInterval(() => setClosed((value) => !value), 3600)
    }, delayMs)

    return () => {
      window.clearTimeout(start)
      if (interval !== undefined) window.clearInterval(interval)
    }
  }, [delayMs])

  const isSplit = direction === 'mitte'

  return (
    <div
      className={`plissee plissee--${direction}${closed ? ' is-closed' : ''}`}
      style={{ aspectRatio: ratio }}
      aria-hidden="true"
    >
      <span className="plissee__view" />
      {isSplit ? (
        <>
          <span className="plissee__mesh plissee__mesh--first" />
          <span className="plissee__mesh plissee__mesh--second" />
        </>
      ) : (
        <span className="plissee__mesh" />
      )}
      <span className="plissee__arrow" />
    </div>
  )
}
