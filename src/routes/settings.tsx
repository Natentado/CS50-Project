import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getMessages, LANG_LABELS, LANGS } from '../i18n'
import { saveSettings } from '../server/functions'
import type { Settings } from '../settings'

export const Route = createFileRoute('/settings')({
  ssr: false,
  component: SettingsScreen,
})

function SettingsScreen() {
  const { settings } = Route.useRouteContext()
  const t = getMessages(settings.lang)
  const persist = useServerFn(saveSettings)
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const update = async (patch: Partial<Settings>) => {
    if (saving) return
    setSaving(true)
    try {
      await persist({ data: { ...settings, ...patch } })
      await router.invalidate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      <div className="app-top">
        <Link to="/" className="icon-btn" aria-label={t.back}>
          ←
        </Link>
      </div>

      <h1 className="screen-title">{t.settingsTitle}</h1>
      <p className="muted hint">{t.settingsHint}</p>

      <div className="setting-block">
        <span className="eyebrow">{t.language}</span>
        <div className="seg">
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              className={`pill ${settings.lang === lang ? 'solid' : 'outline'}`}
              disabled={saving}
              onClick={() => update({ lang })}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-block">
        <span className="eyebrow">{t.theme}</span>
        <div className="seg">
          {(['light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={`pill ${settings.theme === theme ? 'solid' : 'outline'}`}
              disabled={saving}
              onClick={() => update({ theme })}
            >
              {theme === 'dark' ? t.dark : t.light}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
