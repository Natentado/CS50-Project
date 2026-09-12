import { z } from 'zod'
import { createIsomorphicFn } from '@tanstack/react-start'
import { LANGS } from './i18n'

export const SETTINGS_COOKIE = 'wyr-settings'

export const settingsSchema = z.object({
  lang: z.enum(LANGS).default('en').catch('en'),
  theme: z.enum(['dark', 'light']).default('light').catch('light'),
})

export type Settings = z.output<typeof settingsSchema>

const parseSettings = (raw: string | undefined): Settings => {
  let data: unknown = {}
  if (raw) {
    try {
      data = JSON.parse(decodeURIComponent(raw))
    } catch {}
  }
  return settingsSchema.parse(data ?? {})
}

export const readSettings = createIsomorphicFn()
  .server(async (): Promise<Settings> => {
    const { getCookie } = await import('@tanstack/react-start/server')
    return parseSettings(getCookie(SETTINGS_COOKIE))
  })
  .client(async (): Promise<Settings> => {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${SETTINGS_COOKIE}=`))
      ?.slice(SETTINGS_COOKIE.length + 1)
    return parseSettings(raw)
  })
