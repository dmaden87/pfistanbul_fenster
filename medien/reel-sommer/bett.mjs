/**
 * Der Klangteppich unter dem Reel.
 *
 * ABSICHTLICH LEISE. Das Beste am Ton ist das echte Geraeusch des Plissees,
 * wenn es ueber die Schiene laeuft – das steckt in der Originalaufnahme und
 * soll vorn stehen. Dieses Bett traegt nur und fuellt die Stellen, an denen
 * Fotos stehen und sonst Stille waere; Stille mitten in einem Reel wirkt wie
 * ein Fehler im Ton.
 *
 * Und es ist bewusst karg: Wer ein Reel teilt, legt oft eigene Musik darueber.
 * Ein ausgearbeitetes Stueck waere dann weg – ein ruhiger Grundton stoert
 * nicht und fehlt auch nicht.
 */
import { writeFileSync } from 'node:fs'

const RATE = 48000
const SEKUNDEN = 13.8
const ABSPANN = 11.2

/** Weiche Rampe zwischen zwei Zeitpunkten, 0 → 1. */
function spanne(t, von, bis) {
  if (t <= von) return 0
  if (t >= bis) return 1
  const x = (t - von) / (bis - von)
  return x * x * (3 - 2 * x)
}

const anzahl = Math.round(RATE * SEKUNDEN)
const links = new Float32Array(anzahl)
const rechts = new Float32Array(anzahl)

for (let i = 0; i < anzahl; i++) {
  const t = i / RATE
  let wert = 0

  // Grundton, kommt in der ersten Sekunde und bleibt.
  const traeger = spanne(t, 0.0, 1.2) * (1 - spanne(t, SEKUNDEN - 0.8, SEKUNDEN))
  wert += Math.sin(2 * Math.PI * 110 * t) * 0.075 * traeger
  wert += Math.sin(2 * Math.PI * 165 * t) * 0.042 * traeger

  // Ein heller Schimmer ueber den Fotos – dort, wo kein Geraeusch ist.
  const schimmer = spanne(t, 2.4, 3.4) * (1 - spanne(t, 6.6, 7.2))
  wert += Math.sin(2 * Math.PI * 880 * t) * 0.016 * schimmer
  wert += Math.sin(2 * Math.PI * 1320 * t) * 0.009 * schimmer

  // Beim Abspann loest es sich auf: die Terz kommt dazu.
  const schluss = spanne(t, ABSPANN - 0.3, ABSPANN + 0.9)
  wert += Math.sin(2 * Math.PI * 220 * t) * 0.05 * schluss
  wert += Math.sin(2 * Math.PI * 275 * t) * 0.035 * schluss

  // Ganz leichtes Atmen, damit der Ton nicht steht wie ein Pruefton.
  wert *= 1 + 0.06 * Math.sin(2 * Math.PI * 0.17 * t)

  // Minimal versetzt auf die beiden Seiten – das macht Breite ohne Hall.
  links[i] = wert
  rechts[i] = wert * 0.94 + Math.sin(2 * Math.PI * 110.3 * t) * 0.012 * traeger
}

/* --- Als WAV schreiben ------------------------------------------------------ */

const kopf = Buffer.alloc(44)
const daten = Buffer.alloc(anzahl * 4) // 2 Kanaele, 16 Bit
for (let i = 0; i < anzahl; i++) {
  const l = Math.max(-1, Math.min(1, links[i]))
  const r = Math.max(-1, Math.min(1, rechts[i]))
  daten.writeInt16LE(Math.round(l * 32767), i * 4)
  daten.writeInt16LE(Math.round(r * 32767), i * 4 + 2)
}
kopf.write('RIFF', 0)
kopf.writeUInt32LE(36 + daten.length, 4)
kopf.write('WAVE', 8)
kopf.write('fmt ', 12)
kopf.writeUInt32LE(16, 16)
kopf.writeUInt16LE(1, 20)
kopf.writeUInt16LE(2, 22)
kopf.writeUInt32LE(RATE, 24)
kopf.writeUInt32LE(RATE * 4, 28)
kopf.writeUInt16LE(4, 32)
kopf.writeUInt16LE(16, 34)
kopf.write('data', 36)
kopf.writeUInt32LE(daten.length, 40)
writeFileSync('arbeit/bett.wav', Buffer.concat([kopf, daten]))
console.log(`arbeit/bett.wav — ${SEKUNDEN}s`)
