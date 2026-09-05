import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { setzeKopfdaten } from './lib/adresse'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root-Element nicht gefunden.')

/*
 * Titel, Beschreibung und canonical passend zur aufgerufenen Adresse - und
 * zwar hier, vor dem ersten Rendern. In einem Effekt waere es ein Rennen
 * gegen das Ladeereignis, und beim Vorabrendern gewinnt mal das eine, mal
 * das andere. Die Begruendung steht ausfuehrlich in lib/adresse.ts.
 */
setzeKopfdaten(window.location.pathname)

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
