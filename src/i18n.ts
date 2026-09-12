export const LANGS = ['en', 'es', 'pt'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
}

const en = {
  appName: 'Would You Rather? CS50',
  appNameLine1: 'Would You',
  appNameLine2: 'Rather',
  appNameLine3: 'CS50',
  tagline: 'The classic game of impossible choices.',
  heroPlay: 'Play',
  heroSettings: 'Settings',
  starting: 'Shuffling…',
  wouldYouRather: 'Would you rather…',
  or: 'OR',
  votesSoFar: (n: number) => `${n} votes so far`,
  next: 'Next',
  seeResults: 'See results',
  gameNotFound: 'This game doesn’t exist (or expired). Start a new one!',
  back: 'Back',
  resultsTitle: 'Your results',
  crunching: 'Crunching the numbers…',
  matchedMajority: (n: number, total: number) =>
    `You sided with the majority on ${n} of ${total} answers.`,
  skipped: 'skipped',
  withMajority: 'with the majority',
  againstMajority: 'against the majority',
  playAgain: 'Play again',
  backHome: 'Back home',
  settingsTitle: 'Settings',
  language: 'Language',
  theme: 'Theme',
  dark: 'Dark',
  light: 'Light',
  settingsHint: 'Your choices are saved on this device.',
  notFoundTitle: 'Not found',
  notFoundBody: 'That page doesn’t exist (yet).',
}

export type Messages = typeof en

const es: Messages = {
  appName: '¿Qué Prefieres? CS50',
  appNameLine1: '¿Qué',
  appNameLine2: 'Prefieres',
  appNameLine3: 'CS50',
  tagline: 'El clásico juego de las decisiones imposibles.',
  heroPlay: 'Jugar',
  heroSettings: 'Ajustes',
  starting: 'Barajando…',
  wouldYouRather: '¿Qué prefieres…',
  or: 'O',
  votesSoFar: (n) => `${n} votos hasta ahora`,
  next: 'Siguiente',
  seeResults: 'Ver resultados',
  gameNotFound: 'Esta partida no existe (o expiró). ¡Empieza una nueva!',
  back: 'Volver',
  resultsTitle: 'Tus resultados',
  crunching: 'Calculando los números…',
  matchedMajority: (n, total) =>
    `Coincidiste con la mayoría en ${n} de ${total} respuestas.`,
  skipped: 'omitida',
  withMajority: 'con la mayoría',
  againstMajority: 'contra la mayoría',
  playAgain: 'Jugar de nuevo',
  backHome: 'Volver al inicio',
  settingsTitle: 'Ajustes',
  language: 'Idioma',
  theme: 'Tema',
  dark: 'Oscuro',
  light: 'Claro',
  settingsHint: 'Tus preferencias se guardan en este dispositivo.',
  notFoundTitle: 'No encontrado',
  notFoundBody: 'Esa página no existe (todavía).',
}

const pt: Messages = {
  appName: 'O Que Você Prefere? CS50',
  appNameLine1: 'O Que Você',
  appNameLine2: 'Prefere',
  appNameLine3: 'CS50',
  tagline: 'O clássico jogo das escolhas impossíveis.',
  heroPlay: 'Jogar',
  heroSettings: 'Configurações',
  starting: 'Embaralhando…',
  wouldYouRather: 'O que você prefere…',
  or: 'OU',
  votesSoFar: (n) => `${n} votos até agora`,
  next: 'Próxima',
  seeResults: 'Ver resultados',
  gameNotFound: 'Este jogo não existe (ou expirou). Comece um novo!',
  back: 'Voltar',
  resultsTitle: 'Seus resultados',
  crunching: 'Fazendo as contas…',
  matchedMajority: (n, total) =>
    `Você concordou com a maioria em ${n} de ${total} respostas.`,
  skipped: 'pulada',
  withMajority: 'com a maioria',
  againstMajority: 'contra a maioria',
  playAgain: 'Jogar de novo',
  backHome: 'Voltar ao início',
  settingsTitle: 'Configurações',
  language: 'Idioma',
  theme: 'Tema',
  dark: 'Escuro',
  light: 'Claro',
  settingsHint: 'Suas preferências ficam salvas neste dispositivo.',
  notFoundTitle: 'Não encontrado',
  notFoundBody: 'Essa página não existe (ainda).',
}

const messages: Record<Lang, Messages> = { en, es, pt }

export const getMessages = (lang: Lang): Messages => messages[lang]
