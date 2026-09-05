import { useState } from 'react'
import { faq } from '../../data/faq'
import './Faq.css'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section faq" id="faq">
      <div className="shell faq__inner">
        <div className="faq__head">
          <span className="section__eyebrow">Häufige Fragen</span>
          <h2>Was Nachbarn uns am häufigsten fragen.</h2>
          <p className="section__lead">
            Ist Ihre Frage nicht dabei? Schreiben Sie sie einfach ins Bemerkungsfeld der Anfrage – wir antworten
            persönlich.
          </p>
        </div>

        <div className="faq__list">
          {faq.map((item, index) => {
            const isOpen = open === index
            return (
              <div className={`faq-item${isOpen ? ' faq-item--open' : ''}`} key={item.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-item__sign" aria-hidden="true" />
                  </button>
                </h3>
                <div
                  className="faq-item__panel"
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-button-${index}`}
                  hidden={!isOpen}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
