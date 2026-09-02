import { fotos } from '../../data/fotos'

interface FotoProps {
  /** Dateiname ohne Breite und Endung, siehe src/data/fotos.ts. */
  name: string
  /**
   * Was auf dem Bild zu sehen ist – für alle, die es nicht sehen können.
   * Beschreibt den Inhalt, nicht das Bild ("Netz vor dem Fenster", nicht
   * "Foto eines Netzes").
   */
  alt: string
  /**
   * Wie breit das Bild im Layout wird. Ohne diese Angabe nimmt der Browser
   * die volle Fensterbreite an und lädt eine grössere Fassung als nötig.
   */
  sizes: string
  className?: string
  /** Nur fürs erste Bild im sichtbaren Bereich: sofort laden statt beim Scrollen. */
  sofort?: boolean
}

/**
 * Ein Foto in drei Formaten und drei Breiten. Der Browser nimmt das erste
 * Format, das er kennt – AVIF ist am kleinsten, JPEG versteht jeder.
 *
 * `width` und `height` stehen am img und tragen die Masse des Originals.
 * Der Browser rechnet daraus das Seitenverhältnis und reserviert den Platz,
 * bevor das Bild da ist; sonst springt der Text darunter beim Nachladen.
 */
export function Foto({ name, alt, sizes, className, sofort = false }: FotoProps) {
  const masse = fotos[name]
  if (!masse) return null

  const satz = (endung: string) => masse.groessen.map((b) => `/fotos/${name}-${b}.${endung} ${b}w`).join(', ')
  const groesste = masse.groessen[masse.groessen.length - 1]

  return (
    <picture>
      <source type="image/avif" srcSet={satz('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={satz('webp')} sizes={sizes} />
      <img
        src={`/fotos/${name}-${groesste}.jpg`}
        srcSet={satz('jpg')}
        sizes={sizes}
        alt={alt}
        width={masse.breite}
        height={masse.hoehe}
        loading={sofort ? 'eager' : 'lazy'}
        fetchPriority={sofort ? 'high' : undefined}
        decoding="async"
        className={className}
      />
    </picture>
  )
}
