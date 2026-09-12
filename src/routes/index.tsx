import { createFileRoute, Link } from '@tanstack/react-router'
import { getMessages } from '../i18n'
import { PlayButton } from '../PlayButton'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { settings } = Route.useRouteContext()
  const t = getMessages(settings.lang)

  return (
    <div className="screen center">
      <div className="logo-wrap">
        <div className="logo-bubble">
          <span className="logo-text">
            <span className="logo-line1">{t.appNameLine1}</span>
            <span className="logo-line2">
              {t.appNameLine2}
              <span className="logo-q">?</span>
            </span>
            <span className="logo-line3">{t.appNameLine3}</span>
          </span>
        </div>
        <p className="muted logo-tagline">{t.tagline}</p>
      </div>

      <div className="pill-stack" style={{ maxWidth: 300 }}>
        <PlayButton label={t.heroPlay} starting={t.starting} />
        <Link to="/settings" className="pill outline">
          {t.heroSettings}
        </Link>
      </div>
    </div>
  )
}
