import './TrustBar.css'

const ITEMS = [
  { icon: 'shield', title: 'Klebeband statt Dübel', text: 'Fast immer ohne Bohren – wo nicht, sagen wir es vorher' },
  { icon: 'ruler', title: 'Passgarantie', text: 'Auf jedes Mass, das von uns stammt' },
  { icon: 'truck', title: 'Persönlich geliefert', text: 'Kein Versand – wir bringen es Ihnen vorbei' },
  { icon: 'heart', title: 'Von Freunden und Nachbarn', text: 'Kein Callcenter, sondern jemand, den Sie kennen' },
]

function Icon({ name }: { name: string }) {
  const common = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6z" />
          <path d="M9.5 12.2l1.8 1.8 3.4-3.7" />
        </svg>
      )
    case 'ruler':
      return (
        <svg {...common}>
          <rect x="2.5" y="8.5" width="19" height="7" rx="1.5" />
          <path d="M7 8.5v3M11 8.5v4.5M15 8.5v3M19 8.5v4.5" />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <path d="M3 7h10v9H3zM13 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17" cy="18" r="1.6" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-7-9a3.8 3.8 0 0 1 7-2.1A3.8 3.8 0 0 1 19 11c0 4.6-7 9-7 9z" />
        </svg>
      )
  }
}

export function TrustBar() {
  return (
    <section className="trust-bar" aria-label="Was Sie von uns erwarten können">
      <div className="shell trust-bar__inner">
        {ITEMS.map((item) => (
          <div className="trust-bar__item" key={item.title}>
            <span className="trust-bar__icon" aria-hidden="true">
              <Icon name={item.icon} />
            </span>
            <div>
              <p className="trust-bar__title">{item.title}</p>
              <p className="trust-bar__text">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
