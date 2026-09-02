import { useEffect, useState } from 'react'
import './WindowVisual.css'

/**
 * Fenster mit Plissee-Netz, komplett in CSS gebaut. Ersetzt das noch fehlende
 * Produktfoto und zeigt gleichzeitig die Akkordeon-Mechanik: das Netz faehrt
 * langsam zu und wieder auf.
 */
export function WindowVisual() {
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setClosed((value) => !value), 4200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <figure className="window-visual">
      <div className="window-visual__frame">
        <div className="window-visual__view" aria-hidden="true">
          <span className="window-visual__sky" />
          <span className="window-visual__hill" />
          <span className="window-visual__hill window-visual__hill--far" />
          <span className="window-visual__tree" />
          <span className="window-visual__tree window-visual__tree--second" />
        </div>

        <div className={`window-visual__mesh${closed ? ' is-closed' : ''}`} aria-hidden="true">
          <span className="window-visual__pleats" />
        </div>

        <div className="window-visual__rail" aria-hidden="true">
          <span className={`window-visual__handle${closed ? ' is-closed' : ''}`} />
        </div>
      </div>

      <figcaption className="window-visual__caption">
        <span className="window-visual__caption-dot" aria-hidden="true" />
        Plissee: mit einem Griff zu – und genauso schnell wieder offen
      </figcaption>
    </figure>
  )
}
