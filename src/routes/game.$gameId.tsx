import { Suspense, useCallback, useEffect, useState } from 'react'
import { Await, createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getMessages, type Messages } from '../i18n'
import { PlayButton } from '../PlayButton'
import {
  answerGame,
  getGameResults,
  getGameState,
  type GameState,
} from '../server/functions'

/** How long the result stays on screen before the next question. Mirrors `--advance` in styles.css. */
const AUTO_ADVANCE_MS = 5000

const gameSearchSchema = z.object({
  q: z.coerce.number().int().min(1).default(1).catch(1),
})

export const Route = createFileRoute('/game/$gameId')({
  validateSearch: gameSearchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ params, deps, context }) => {
    const state = await getGameState({
      data: { gameId: params.gameId, index: deps.q, lang: context.settings.lang },
    })
    const results =
      state.status === 'finished'
        ? getGameResults({
            data: { gameId: params.gameId, lang: context.settings.lang },
          })
        : null
    return { state, results }
  },
  component: GameScreen,
  notFoundComponent: GameNotFound,
})

function GameNotFound() {
  const { settings } = Route.useRouteContext()
  const t = getMessages(settings.lang)
  return (
    <div className="sheet">
      <div className="screen center">
        <p className="muted" style={{ maxWidth: 280 }}>
          {t.gameNotFound}
        </p>
        <div className="pill-stack" style={{ marginTop: '1.5rem', maxWidth: 280 }}>
          <PlayButton label={t.playAgain} starting={t.starting} />
        </div>
      </div>
    </div>
  )
}

function GameScreen() {
  const { settings } = Route.useRouteContext()
  const t = getMessages(settings.lang)
  const { state, results } = Route.useLoaderData()

  if (state.status === 'finished') {
    return (
      <div className="sheet">
        <div className="screen">
          <div className="app-top">
            <Link to="/" className="icon-btn" aria-label={t.backHome}>
              ×
            </Link>
            <span className="eyebrow" style={{ flex: 1, textAlign: 'center' }}>
              {t.resultsTitle}
            </span>
            <span style={{ width: 42 }} aria-hidden />
          </div>

          <Suspense
            fallback={
              <p className="muted hint pulse" style={{ marginTop: '4rem' }}>
                {t.crunching}
              </p>
            }
          >
            {results && (
              <Await promise={results}>
                {(summary) => <ResultsBody summary={summary} t={t} />}
              </Await>
            )}
          </Suspense>

          <div className="bottom-slot">
            <PlayButton label={t.playAgain} starting={t.starting} />
            <Link to="/" className="pill outline">
              {t.backHome}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <QuestionScreen
      key={`${state.question.id}-${state.index}`}
      state={state}
      t={t}
    />
  )
}

type Summary = Awaited<ReturnType<typeof getGameResults>>

function ResultsBody({ summary, t }: { summary: Summary; t: Messages }) {
  return (
    <>
      <div className="score-big">
        {summary.matched}/{summary.answered}
      </div>
      <p className="muted hint" style={{ margin: 0 }}>
        {t.matchedMajority(summary.matched, summary.answered)}
      </p>

      <div className="res-list">
        {summary.rows.map((row) => (
          <div key={row.index} className="res-row">
            <span
              className={`res-icon ${row.yourChoice === null ? '' : row.matched ? 'good' : 'bad'}`}
              aria-hidden
            >
              {row.yourChoice === null ? '–' : row.matched ? '✓' : '✗'}
            </span>
            <span className="res-text">
              {row.yourChoice === 'A' ? <strong>{row.optionA}</strong> : row.optionA}
              <span className="muted"> {t.or.toLowerCase()} </span>
              {row.yourChoice === 'B' ? <strong>{row.optionB}</strong> : row.optionB}
            </span>
            <span className="muted res-note">
              {row.yourChoice === null
                ? t.skipped
                : row.matched
                  ? `${row.majorityPct}% ${t.withMajority}`
                  : `${row.majorityPct}% ${t.againstMajority}`}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

/** How long a percentage takes to climb to its real value. */
const COUNT_UP_MS = 900

/**
 * Runs a percentage up from zero so the split *lands* rather than simply
 * appearing. Both panes count at once, so they settle together on 100.
 */
function useCountUp(target: number, active: boolean) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!active) {
      setShown(0)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS)
      // Ease out cubic: quick off the mark, gentle landing.
      setShown(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, active])

  return shown
}

function DuelPane({
  side,
  label,
  pct,
  picked,
  revealed,
  onPick,
}: {
  side: 'a' | 'b'
  label: string
  pct: number
  picked: boolean
  revealed: boolean
  onPick: () => void
}) {
  const shown = useCountUp(pct, revealed)

  return (
    <button
      type="button"
      className={`duel-pane ${side}${revealed ? ' revealed' : ''}${picked ? ' picked' : ''}`}
      disabled={revealed}
      onClick={onPick}
    >
      <span className="duel-label">{label}</span>
      {revealed && (
        <span className="duel-pct">
          {/* Sighted players watch it climb; screen readers get the final figure once. */}
          <span aria-hidden>{shown}%</span>
          <span className="visually-hidden">{pct}%</span>
        </span>
      )}
    </button>
  )
}

function QuestionScreen({
  state,
  t,
}: {
  state: Extract<GameState, { status: 'question' }>
  t: Messages
}) {
  const submit = useServerFn(answerGame)
  const navigate = useNavigate()
  const { gameId } = Route.useParams()
  // The loader stays the source of truth — coming back to a question must show
  // the answer it already has. `picked` only covers the moment between the tap
  // and the next load, and resets with the component on every new question.
  const [picked, setPicked] = useState<typeof state.answer>(null)
  const answer = picked ?? state.answer
  const [pending, setPending] = useState(false)
  // Only answers given right now start the countdown: coming *back* to a question
  // already answered must not bounce the player forward again.
  const [counting, setCounting] = useState(false)

  const isLast = state.index >= state.total

  const goNext = useCallback(() => {
    navigate({
      to: '/game/$gameId',
      params: { gameId },
      search: { q: state.index + 1 },
    })
  }, [navigate, gameId, state.index])

  const pick = async (choice: 'A' | 'B') => {
    if (answer || pending) return
    setPending(true)
    try {
      setPicked(await submit({ data: { gameId, index: state.index, choice } }))
      setCounting(true)
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (!counting) return
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [counting, goNext])

  const total = answer ? answer.votesA + answer.votesB : 0
  const pctA = answer ? Math.round((answer.votesA / Math.max(1, total)) * 100) : 0
  const pctB = answer ? 100 - pctA : 0

  return (
    <div className="duel">
      <div className="duel-progress" aria-hidden>
        <span style={{ width: `${((state.index - 1) / state.total) * 100}%` }} />
      </div>

      {/* The panes carry the whole question visually; the prompt stays for screen readers. */}
      <h1 className="visually-hidden">{t.wouldYouRather}</h1>

      <div className="duel-top">
        <Link to="/" className="icon-btn ghost" aria-label={t.backHome}>
          ×
        </Link>
        <span className="duel-count">
          {state.index}/{state.total}
        </span>
      </div>

      <DuelPane
        side="a"
        label={state.question.optionA}
        pct={pctA}
        picked={answer?.choice === 'A'}
        revealed={answer !== null}
        onPick={() => pick('A')}
      />

      <span className="duel-or" aria-hidden>
        {t.or}
      </span>

      <DuelPane
        side="b"
        label={state.question.optionB}
        pct={pctB}
        picked={answer?.choice === 'B'}
        revealed={answer !== null}
        onPick={() => pick('B')}
      />

      {answer && (
        <div className="duel-foot">
          <span className="duel-votes" aria-live="polite">
            {t.votesSoFar(total)}
          </span>
          <button
            type="button"
            className={`duel-next${counting ? ' counting' : ''}`}
            onClick={goNext}
            aria-label={isLast ? t.seeResults : t.next}
          >
            <svg viewBox="0 0 40 40" aria-hidden>
              <circle className="ring-track" cx="20" cy="20" r="18" />
              <circle className="ring-run" cx="20" cy="20" r="18" />
            </svg>
            <span aria-hidden>›</span>
          </button>
        </div>
      )}
    </div>
  )
}
