import { createRouter, type ParsedLocation } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const screenRank = (location: ParsedLocation): number => {
  const depth = location.pathname.split('/').filter(Boolean).length
  const q = (location.search as { q?: number }).q
  return depth * 100 + (typeof q === 'number' ? q : 0)
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation, hrefChanged }) => {
        if (!hrefChanged) return false
        if (!fromLocation) return ['forward']
        return screenRank(toLocation) < screenRank(fromLocation)
          ? ['backward']
          : ['forward']
      },
    },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
