import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { startGame } from './server/functions'

export function PlayButton({
  label,
  starting,
  className = 'pill solid',
}: {
  label: string
  starting: string
  className?: string
}) {
  const navigate = useNavigate()
  const start = useServerFn(startGame)
  const [pending, setPending] = useState(false)

  const begin = async () => {
    if (pending) return
    setPending(true)
    try {
      const { gameId } = await start()
      navigate({ to: '/game/$gameId', params: { gameId }, search: { q: 1 } })
    } catch {
      setPending(false)
    }
  }

  return (
    <button type="button" className={className} disabled={pending} onClick={begin}>
      {pending ? starting : label}
    </button>
  )
}
