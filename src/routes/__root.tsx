import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { getMessages } from '../i18n'
import { readSettings } from '../settings'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async () => ({ settings: await readSettings() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Would You Rather? CS50' },
      {
        name: 'description',
        content: '“Would You Rather? CS50” — the classic game of impossible choices, built with TanStack Start.',
      },
      { name: 'theme-color', content: '#2e5fbe' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='8' y='6' width='84' height='64' rx='16' fill='%232e5fbe' stroke='white' stroke-width='7'/%3E%3Cpath d='M40 68 L50 90 L60 68 Z' fill='%232e5fbe' stroke='white' stroke-width='7' stroke-linejoin='round'/%3E%3Ctext x='50' y='54' font-size='44' text-anchor='middle' fill='white' font-family='Georgia, serif' font-weight='bold'%3E%3F%3C/text%3E%3C/svg%3E",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundScreen,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function NotFoundScreen() {
  const { settings } = Route.useRouteContext()
  const t = getMessages(settings.lang)
  return (
    <div className="screen center">
      <h1 className="screen-title">{t.notFoundTitle}</h1>
      <p className="muted">{t.notFoundBody}</p>
      <div className="pill-stack" style={{ marginTop: '1.5rem', maxWidth: 280 }}>
        <Link to="/" className="pill solid">
          {t.backHome}
        </Link>
      </div>
    </div>
  )
}

/**
 * Which screen is on show, as a single attribute on <body>. The doodled
 * background belongs to the home screen alone, and the game takes the whole
 * viewport instead of the phone-width column — both are one CSS rule away
 * once the document knows where it is.
 */
const screenOf = (pathname: string): 'home' | 'game' | 'app' => {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/game/')) return 'game'
  return 'app'
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { settings } = Route.useRouteContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <html lang={settings.lang} data-theme={settings.theme}>
      <head>
        <HeadContent />
      </head>
      <body data-screen={screenOf(pathname)}>
        <main className="app">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
