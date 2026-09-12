import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { LANGS, type Lang } from '../i18n'
import { SETTINGS_COOKIE, settingsSchema } from '../settings'
import {
  CATEGORIES,
  getDb,
  type Choice,
  type GameSession,
  type Question,
  type Votes,
} from './db'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface PublicQuestion {
  id: string
  optionA: string
  optionB: string
  category: (typeof CATEGORIES)[number]
}

const localize = (q: Question, lang: Lang): PublicQuestion => ({
  id: q.id,
  optionA: q.optionA[lang],
  optionB: q.optionB[lang],
  category: q.category,
})

const requireSession = (gameId: string): GameSession => {
  const session = getDb().sessions.get(gameId)
  if (!session) throw notFound()
  return session
}

const requireQuestion = (id: string): Question => {
  const question = getDb().questions.get(id)
  if (!question) throw notFound()
  return question
}

const requireVotes = (slug: string): Votes => {
  const votes = getDb().getVotes(slug)
  if (!votes) throw notFound()
  return votes
}

export const saveSettings = createServerFn({ method: 'POST' })
  .validator(settingsSchema)
  .handler(async ({ data }) => {
    const { setCookie } = await import('@tanstack/react-start/server')
    setCookie(SETTINGS_COOKIE, JSON.stringify(data), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return data
  })

export const GAME_LENGTH = 50

export const startGame = createServerFn({ method: 'POST' }).handler(async () => {
  const db = getDb()

  const ids = [...db.questions.keys()]
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
  }
  const total = Math.min(GAME_LENGTH, ids.length)

  if (db.sessions.size >= 200) {
    const oldest = [...db.sessions.values()].sort(
      (a, b) => a.createdAt - b.createdAt,
    )[0]
    if (oldest) db.sessions.delete(oldest.id)
  }

  const session: GameSession = {
    id: crypto.randomUUID(),
    questionIds: ids.slice(0, total),
    total,
    answers: {},
    createdAt: Date.now(),
  }
  db.sessions.set(session.id, session)
  return { gameId: session.id, total }
})

export type GameState =
  | {
      status: 'question'
      index: number
      total: number
      question: PublicQuestion
      answer: { choice: 'A' | 'B'; votesA: number; votesB: number } | null
    }
  | { status: 'finished'; total: number; answered: number }

export const getGameState = createServerFn()
  .validator(
    z.object({
      gameId: z.string(),
      index: z.number().int().min(1),
      lang: z.enum(LANGS),
    }),
  )
  .handler(async ({ data }): Promise<GameState> => {
    const session = requireSession(data.gameId)
    if (data.index > session.total) {
      return {
        status: 'finished',
        total: session.total,
        answered: Object.keys(session.answers).length,
      }
    }
    const questionId = session.questionIds[data.index - 1]
    if (!questionId) throw notFound()
    const question = requireQuestion(questionId)
    const choice = session.answers[data.index]
    return {
      status: 'question',
      index: data.index,
      total: session.total,
      question: localize(question, data.lang),
      answer: choice ? { choice, ...requireVotes(question.id) } : null,
    }
  })

export const answerGame = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      gameId: z.string(),
      index: z.number().int().min(1),
      choice: z.enum(['A', 'B']),
    }),
  )
  .handler(async ({ data }) => {
    const session = requireSession(data.gameId)
    if (data.index > session.total) throw notFound()
    const question = requireQuestion(session.questionIds[data.index - 1]!)

    // First answer wins. There is no await between reading and writing
    // session.answers, so two taps racing each other still yield one vote.
    const existing = session.answers[data.index]
    if (existing) return { choice: existing, ...requireVotes(question.id) }

    session.answers[data.index] = data.choice
    const votes = getDb().addVote(question.id, data.choice)
    if (!votes) throw notFound()
    return { choice: data.choice, ...votes }
  })

export const getGameResults = createServerFn()
  .validator(z.object({ gameId: z.string(), lang: z.enum(LANGS) }))
  .handler(async ({ data }) => {
    await sleep(1200)
    const session = requireSession(data.gameId)
    const votes = getDb().getVotesFor(session.questionIds)

    const rows = session.questionIds.map((questionId, i) => {
      const question = requireQuestion(questionId)
      const { votesA, votesB } = votes.get(questionId) ?? { votesA: 0, votesB: 0 }
      const yourChoice = session.answers[i + 1] ?? null
      const majority: Choice = votesA >= votesB ? 'A' : 'B'
      const total = votesA + votesB
      const majorityPct =
        total === 0
          ? 50
          : Math.round((Math.max(votesA, votesB) / total) * 100)
      return {
        index: i + 1,
        optionA: question.optionA[data.lang],
        optionB: question.optionB[data.lang],
        yourChoice,
        majority,
        majorityPct,
        matched: yourChoice !== null && yourChoice === majority,
      }
    })

    const answered = rows.filter((r) => r.yourChoice !== null)
    return {
      rows,
      answered: answered.length,
      matched: answered.filter((r) => r.matched).length,
    }
  })

