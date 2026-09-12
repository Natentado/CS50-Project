import { DatabaseSync } from 'node:sqlite'
import { createServerOnlyFn } from '@tanstack/react-start'
import type { Lang } from '../i18n'

export const CATEGORIES = ['foundations', 'algorithms', 'memory', 'data', 'web', 'course'] as const
export type Category = (typeof CATEGORIES)[number]

export type LocalizedText = Record<Lang, string>

export type Choice = 'A' | 'B'

/** Question text is content, not data: it lives in `ROWS` below, never in SQLite. */
export interface Question {
  id: string
  optionA: LocalizedText
  optionB: LocalizedText
  category: Category
}

/** Vote totals are the one thing that has to outlive the process. */
export interface Votes {
  votesA: number
  votesB: number
}

export interface GameSession {
  id: string
  questionIds: string[]
  total: number
  answers: Record<number, Choice>
  createdAt: number
}

interface Db {
  /** All 50 dilemmas, keyed by slug. Read-only; rebuilt from `ROWS` on every boot. */
  questions: ReadonlyMap<string, Question>
  /** In-memory and deliberately so — see the note on `getDb`. */
  sessions: Map<string, GameSession>
  /** Current totals for one question, or `undefined` if the slug is unknown. */
  getVotes: (slug: string) => Votes | undefined
  /** Totals for many questions in a single query, to keep the results screen at one round trip. */
  getVotesFor: (slugs: string[]) => Map<string, Votes>
  /** Atomically adds one vote and returns the new totals. */
  addVote: (slug: string, choice: Choice) => Votes | undefined
}

type SeedRow = [slug: string, category: Category, en: string, es: string, pt: string]

// 50 dilemmas drawn from CS50x: one per line, a stable slug then `optionA|optionB`
// in en / es / pt. The slug is the question's permanent identity: vote totals are
// keyed on it, so rows may be added, edited or reordered freely, but a slug must
// never be renamed or reused — that would reattach votes to a different dilemma.
const ROWS: SeedRow[] = [
  // Weeks 0–2 — Scratch, C, arrays, strings, compiling, cryptography
  ['scratch-final-project', 'foundations', 'build your final project entirely in Scratch|write your Scratch animations entirely in C', 'hacer todo tu proyecto final en Scratch|escribir tus animaciones de Scratch en C', 'fazer todo o seu projeto final em Scratch|escrever suas animações de Scratch em C'],
  ['binary-vs-ascii', 'foundations', 'think in binary for the rest of your life|read every file as raw ASCII codes', 'pensar en binario por el resto de tu vida|leer cada archivo como códigos ASCII crudos', 'pensar em binário pelo resto da vida|ler cada arquivo como códigos ASCII puros'],
  ['pseudocode-vs-typing', 'foundations', 'write pseudocode for an hour before touching the keyboard|start typing immediately and refactor forever', 'escribir pseudocódigo una hora antes de tocar el teclado|empezar a teclear ya y refactorizar para siempre', 'escrever pseudocódigo por uma hora antes de tocar no teclado|começar a digitar já e refatorar para sempre'],
  ['semicolons-vs-braces', 'foundations', 'lose every semicolon in C|lose every curly brace in C', 'quedarte sin punto y coma en C|quedarte sin llaves en C', 'ficar sem ponto e vírgula em C|ficar sem chaves em C'],
  ['compiler-errors-all-at-once', 'foundations', 'see all 100 compiler errors at once|see one error at a time, recompiling after each', 'ver los 100 errores del compilador de una vez|ver un error a la vez, recompilando después de cada uno', 'ver os 100 erros do compilador de uma vez|ver um erro por vez, recompilando a cada um'],
  ['overflow-vs-precision', 'foundations', 'have every integer silently overflow|have every float quietly lose precision', 'que cada entero se desborde en silencio|que cada float pierda precisión sin avisar', 'que todo inteiro estoure em silêncio|que todo float perca precisão sem avisar'],
  ['argv-vs-prompt', 'foundations', 'pass everything in as a command-line argument|prompt the user for every single value', 'pasar todo por argumentos de línea de comandos|pedirle al usuario cada valor uno por uno', 'passar tudo por argumentos de linha de comando|pedir ao usuário cada valor, um por um'],
  ['caesar-vs-substitution', 'foundations', 'encrypt with Caesar and a key everyone guesses|encrypt with Substitution and lose the key', 'cifrar con César y una clave que todos adivinan|cifrar con Sustitución y perder la clave', 'cifrar com César e uma chave que todos adivinham|cifrar com Substituição e perder a chave'],
  ['explain-string-vs-compiler', 'foundations', 'explain to a beginner what a string really is|explain to a beginner what the compiler really does', 'explicarle a un principiante qué es realmente un string|explicarle a un principiante qué hace realmente el compilador', 'explicar para um iniciante o que é de verdade uma string|explicar para um iniciante o que o compilador faz de verdade'],
  // Week 3 — searching, sorting, recursion, running times
  ['binary-vs-linear-search', 'algorithms', 'binary search a list someone else sorted|linear search a list you sorted yourself', 'hacer búsqueda binaria en una lista que ordenó otro|hacer búsqueda lineal en una lista que ordenaste tú', 'fazer busca binária numa lista que outra pessoa ordenou|fazer busca linear numa lista que você mesmo ordenou'],
  ['nlogn-vs-mixed', 'algorithms', 'run in O(n log n) every single time|run in O(1) half the time and O(n²) the rest', 'correr en O(n log n) siempre|correr en O(1) la mitad de las veces y en O(n²) la otra mitad', 'rodar em O(n log n) sempre|rodar em O(1) na metade das vezes e em O(n²) na outra metade'],
  ['bubble-vs-merge', 'algorithms', 'sort everything with bubble sort|sort with merge sort, rewriting it from scratch every time', 'ordenar todo con bubble sort|ordenar con merge sort reescribiéndolo desde cero cada vez', 'ordenar tudo com bubble sort|ordenar com merge sort reescrevendo-o do zero toda vez'],
  ['recursion-vs-infinite-loop', 'algorithms', 'debug a recursion with no base case|debug a loop you can never break out of', 'depurar una recursión sin caso base|depurar un bucle del que nunca puedes salir', 'depurar uma recursão sem caso base|depurar um laço do qual você nunca consegue sair'],
  ['tideman-vs-runoff', 'algorithms', 'attempt Tideman once|solve Runoff five times', 'intentar Tideman una vez|resolver Runoff cinco veces', 'tentar o Tideman uma vez|resolver o Runoff cinco vezes'],
  ['plurality-vs-runoff', 'algorithms', 'count votes with Plurality and accept the winner|hold a Runoff and never finish counting', 'contar votos con Plurality y aceptar al ganador|hacer un Runoff y no terminar nunca de contar', 'contar votos com o Plurality e aceitar o vencedor|fazer um Runoff e nunca terminar a contagem'],
  ['runtime-vs-answer', 'algorithms', 'know the running time of everything but never the answer|know every answer but never how long it takes', 'saber el tiempo de ejecución de todo pero nunca la respuesta|saber todas las respuestas pero nunca cuánto tardan', 'saber o tempo de execução de tudo mas nunca a resposta|saber todas as respostas mas nunca quanto tempo levam'],
  ['correct-vs-fast', 'algorithms', 'write code that is always correct and sometimes slow|write code that is always fast and sometimes wrong', 'escribir código siempre correcto y a veces lento|escribir código siempre rápido y a veces equivocado', 'escrever código sempre correto e às vezes lento|escrever código sempre rápido e às vezes errado'],
  // Weeks 4–5 — pointers, memory, images, data structures
  ['segfault-vs-leak', 'memory', 'hunt a segfault with no error message|hunt a memory leak that never crashes anything', 'perseguir un segfault sin ningún mensaje de error|perseguir una fuga de memoria que nunca hace fallar nada', 'caçar um segfault sem nenhuma mensagem de erro|caçar um vazamento de memória que nunca quebra nada'],
  ['malloc-vs-free', 'memory', 'use a malloc that never fails but never frees|use a free that works but sometimes frees the wrong thing', 'usar un malloc que nunca falla pero nunca libera|usar un free que funciona pero a veces libera lo que no era', 'usar um malloc que nunca falha mas nunca libera|usar um free que funciona mas às vezes libera o que não devia'],
  ['stack-vs-heap', 'memory', 'put everything on the stack|put everything on the heap', 'poner todo en la pila|poner todo en el heap', 'colocar tudo na pilha|colocar tudo no heap'],
  ['hex-vs-pointer-arithmetic', 'memory', 'read hexadecimal fluently|write pointer arithmetic fluently', 'leer hexadecimal con fluidez|escribir aritmética de punteros con fluidez', 'ler hexadecimal com fluência|escrever aritmética de ponteiros com fluência'],
  ['recover-vs-blur', 'memory', 'recover 50 deleted JPEGs byte by byte|blur every pixel of a photo by hand', 'recuperar 50 JPEG borrados byte por byte|desenfocar cada píxel de una foto a mano', 'recuperar 50 JPEGs apagados byte a byte|desfocar cada pixel de uma foto na mão'],
  ['hash-table-vs-trie', 'memory', 'implement a hash table from scratch|implement a trie from scratch', 'implementar una tabla hash desde cero|implementar un trie desde cero', 'implementar uma tabela hash do zero|implementar uma trie do zero'],
  ['linked-list-vs-array', 'memory', 'use a linked list where searching is slow|use an array where inserting is slow', 'usar una lista enlazada donde buscar es lento|usar un arreglo donde insertar es lento', 'usar uma lista ligada em que buscar é lento|usar um array em que inserir é lento'],
  ['stacks-vs-queues', 'memory', 'live with only stacks|live with only queues', 'vivir solo con pilas|vivir solo con colas', 'viver só com pilhas|viver só com filas'],
  ['speller-fast-vs-leakfree', 'memory', 'finish Speller in 0.1 seconds while leaking 5 MB|finish Speller leak-free in 10 seconds', 'terminar Speller en 0,1 segundos con una fuga de 5 MB|terminar Speller sin fugas en 10 segundos', 'terminar o Speller em 0,1 segundo vazando 5 MB|terminar o Speller sem vazamentos em 10 segundos'],
  // Weeks 6–7 and AI — Python, SQL, artificial intelligence
  ['compile-time-vs-runtime', 'data', 'wait for a compiler before every run|run instantly and meet the error at runtime', 'esperar al compilador antes de cada ejecución|ejecutar al instante y encontrar el error en tiempo de ejecución', 'esperar o compilador antes de cada execução|executar na hora e encontrar o erro em tempo de execução'],
  ['indentation-vs-braces', 'data', 'write Python where indentation decides everything|write C where one missing brace decides everything', 'escribir Python donde la indentación lo decide todo|escribir C donde una llave que falta lo decide todo', 'escrever Python onde a indentação decide tudo|escrever C onde uma chave faltando decide tudo'],
  ['rewrite-c-vs-python', 'data', 'rewrite every C problem set in Python|rewrite every Python problem set in C', 'reescribir cada problem set de C en Python|reescribir cada problem set de Python en C', 'reescrever cada problem set de C em Python|reescrever cada problem set de Python em C'],
  ['no-libraries-vs-only-libraries', 'data', 'never import a library again|only use libraries and never write the logic yourself', 'no volver a importar una librería|usar solo librerías y no escribir tú la lógica', 'nunca mais importar uma biblioteca|só usar bibliotecas e nunca escrever a lógica você mesmo'],
  ['dict-vs-list', 'data', 'keep everything in a dictionary|keep everything in a list', 'guardar todo en un diccionario|guardar todo en una lista', 'guardar tudo em um dicionário|guardar tudo em uma lista'],
  ['fiftyville-vs-join', 'data', 'solve Fiftyville with no hints|write one JOIN across seven tables', 'resolver Fiftyville sin ninguna pista|escribir un JOIN entre siete tablas', 'resolver o Fiftyville sem nenhuma dica|escrever um JOIN entre sete tabelas'],
  ['indexes-vs-races', 'data', 'lose every index on your database|have every query be a race condition', 'perder todos los índices de tu base de datos|que cada consulta sea una condición de carrera', 'perder todos os índices do seu banco de dados|que toda consulta seja uma condição de corrida'],
  ['select-star-vs-columns', 'data', 'type SELECT * for the rest of your life|list every column name by hand, every time', 'escribir SELECT * por el resto de tu vida|listar cada nombre de columna a mano, siempre', 'escrever SELECT * pelo resto da vida|listar cada nome de coluna na mão, sempre'],
  ['ai-hallucinate-vs-unsure', 'data', 'use an AI that hallucinates confidently|use an AI that answers “I’m not sure” to everything', 'usar una IA que alucina con toda seguridad|usar una IA que responde “no estoy segura” a todo', 'usar uma IA que alucina com toda a confiança|usar uma IA que responde “não tenho certeza” para tudo'],
  ['minimax-vs-neural-nets', 'data', 'understand minimax completely|understand neural networks completely', 'entender minimax por completo|entender las redes neuronales por completo', 'entender minimax por completo|entender redes neurais por completo'],
  // Weeks 8–9 — HTML, CSS, JavaScript, Flask, the internet
  ['center-div-vs-cross-browser', 'web', 'center a div for the rest of your life|make one page look right in every browser', 'centrar un div por el resto de tu vida|hacer que una página se vea bien en todos los navegadores', 'centralizar uma div pelo resto da vida|fazer uma página ficar certa em todos os navegadores'],
  ['no-flexbox-vs-no-dom', 'web', 'write CSS with no flexbox|write JavaScript with no DOM', 'escribir CSS sin flexbox|escribir JavaScript sin el DOM', 'escrever CSS sem flexbox|escrever JavaScript sem o DOM'],
  ['handwritten-html-vs-bootstrap', 'web', 'hand-write every line of HTML|build everything out of Bootstrap components', 'escribir cada línea de HTML a mano|construir todo con componentes de Bootstrap', 'escrever cada linha de HTML na mão|construir tudo com componentes do Bootstrap'],
  ['debug-css-vs-regex', 'web', 'debug CSS|debug a regular expression', 'depurar CSS|depurar una expresión regular', 'depurar CSS|depurar uma expressão regular'],
  ['flask-sessions-vs-cookies', 'web', 'ship a Flask app with no sessions|ship a Flask app with cookies you can never delete', 'lanzar una app de Flask sin sesiones|lanzar una app de Flask con cookies que nunca puedes borrar', 'lançar um app Flask sem sessões|lançar um app Flask com cookies que você nunca consegue apagar'],
  ['frontend-vs-backend', 'web', 'own the front end forever|own the back end forever', 'encargarte del frontend para siempre|encargarte del backend para siempre', 'cuidar do front-end para sempre|cuidar do back-end para sempre'],
  ['error-500-vs-404', 'web', 'get a 500 error with no traceback|get a 404 for a page you know exists', 'recibir un error 500 sin traceback|recibir un 404 en una página que sabes que existe', 'receber um erro 500 sem traceback|receber um 404 numa página que você sabe que existe'],
  ['dns-vs-tcpip', 'web', 'explain how DNS works from memory|explain how TCP/IP works from memory', 'explicar de memoria cómo funciona el DNS|explicar de memoria cómo funciona TCP/IP', 'explicar de cabeça como o DNS funciona|explicar de cabeça como o TCP/IP funciona'],
  // Week 10 and the course itself — problem sets, tooling, the fair, the duck
  ['check50-vs-style50', 'course', 'pass every check50 test with style50 all red|have perfect style and fail every check50 test', 'pasar todos los tests de check50 con style50 en rojo|tener un estilo perfecto y fallar todos los tests de check50', 'passar em todos os testes do check50 com o style50 todo vermelho|ter um estilo perfeito e falhar em todos os testes do check50'],
  ['deadline-vs-early', 'course', 'submit every problem set one minute before the deadline|start a month early and never feel finished', 'entregar cada problem set un minuto antes de la fecha límite|empezar un mes antes y no sentirte nunca listo', 'entregar cada problem set um minuto antes do prazo|começar um mês antes e nunca se sentir pronto'],
  ['lost-project-vs-unexplainable', 'course', 'lose your final project the night before the CS50 Fair|present a project that works but you can’t explain', 'perder tu proyecto final la noche antes de la CS50 Fair|presentar un proyecto que funciona pero que no sabes explicar', 'perder seu projeto final na noite antes da CS50 Fair|apresentar um projeto que funciona mas que você não sabe explicar'],
  ['one-week-vs-five-years', 'course', 'finish CS50 in one intense week|finish CS50 over five relaxed years', 'terminar CS50 en una semana intensa|terminar CS50 a lo largo de cinco años tranquilos', 'terminar o CS50 em uma semana intensa|terminar o CS50 ao longo de cinco anos tranquilos'],
  ['lectures-vs-notes', 'course', 'rewatch every lecture|reread every set of notes', 'volver a ver todas las clases|volver a leer todos los apuntes', 'rever todas as aulas|reler todas as anotações'],
  ['duck-questions-vs-answers', 'course', 'have a duck that only asks you questions|have a duck that only gives you answers', 'tener un pato que solo te hace preguntas|tener un pato que solo te da respuestas', 'ter um pato que só te faz perguntas|ter um pato que só te dá respostas'],
]

/**
 * Where the vote counters live. Defaults to a file in the project root for dev;
 * on a server point it at a path that survives a redeploy (`.output/` does not),
 * e.g. DATABASE_PATH=/var/lib/wyr/wyr.db.
 */
const DB_PATH = process.env.DATABASE_PATH ?? 'wyr.db'

/** The questions themselves, parsed out of `ROWS`. Cheap, deterministic, no I/O. */
const loadQuestions = (): ReadonlyMap<string, Question> => {
  const questions = new Map<string, Question>()
  for (const [id, category, en, es, pt] of ROWS) {
    const [enA, enB] = en.split('|') as [string, string]
    const [esA, esB] = es.split('|') as [string, string]
    const [ptA, ptB] = pt.split('|') as [string, string]
    questions.set(id, {
      id,
      category,
      optionA: { en: enA, es: esA, pt: ptA },
      optionB: { en: enB, es: esB, pt: ptB },
    })
  }
  if (questions.size !== ROWS.length) throw new Error('duplicate slug in ROWS')
  return questions
}

const open = (): DatabaseSync => {
  const sqlite = new DatabaseSync(DB_PATH)
  // WAL lets readers run while a vote is being counted, and survives a hard kill.
  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      slug     TEXT PRIMARY KEY,
      category TEXT    NOT NULL,
      votes_a  INTEGER NOT NULL DEFAULT 0,
      votes_b  INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Add rows for any new dilemma without ever touching counters that already exist,
  // so editing or reordering ROWS is always safe. Starting totals are the same
  // deterministic pseudo-random values the in-memory store used to seed with.
  const upsert = sqlite.prepare(`
    INSERT INTO questions (slug, category, votes_a, votes_b) VALUES (?, ?, ?, ?)
    ON CONFLICT (slug) DO UPDATE SET category = excluded.category
  `)
  sqlite.exec('BEGIN')
  try {
    ROWS.forEach(([slug, category], i) => {
      upsert.run(slug, category, 20 + ((i * 17 + 13) % 80), 20 + ((i * 31 + 7) % 80))
    })
    sqlite.exec('COMMIT')
  } catch (error) {
    sqlite.exec('ROLLBACK')
    throw error
  }
  return sqlite
}

/** SQLite hands back plain records; narrow them in one place. */
const toVotes = (row: unknown): Votes | undefined => {
  if (!row) return undefined
  const { votesA, votesB } = row as Record<string, number>
  return { votesA: Number(votesA), votesB: Number(votesB) }
}

const connect = (): Db => {
  const sqlite = open()

  const selectOne = sqlite.prepare(
    'SELECT votes_a AS votesA, votes_b AS votesB FROM questions WHERE slug = ?',
  )
  // One statement per choice, so the increment happens in SQL rather than as a
  // read-modify-write here — two simultaneous votes can never lose one another.
  const bump: Record<Choice, ReturnType<DatabaseSync['prepare']>> = {
    A: sqlite.prepare(
      'UPDATE questions SET votes_a = votes_a + 1 WHERE slug = ? RETURNING votes_a AS votesA, votes_b AS votesB',
    ),
    B: sqlite.prepare(
      'UPDATE questions SET votes_b = votes_b + 1 WHERE slug = ? RETURNING votes_a AS votesA, votes_b AS votesB',
    ),
  }

  return {
    questions: loadQuestions(),
    sessions: new Map(),
    getVotes: (slug) => toVotes(selectOne.get(slug)),
    getVotesFor: (slugs) => {
      const found = new Map<string, Votes>()
      if (slugs.length === 0) return found
      const rows = sqlite
        .prepare(
          `SELECT slug, votes_a AS votesA, votes_b AS votesB
             FROM questions WHERE slug IN (${slugs.map(() => '?').join(',')})`,
        )
        .all(...slugs)
      for (const row of rows) {
        const votes = toVotes(row)
        if (votes) found.set(String(row.slug), votes)
      }
      return found
    },
    addVote: (slug, choice) => toVotes(bump[choice].get(slug)),
  }
}

/**
 * Sessions stay on `globalThis` rather than in SQLite: they are single-user,
 * worthless once the results screen is shown, and persisting them would buy a
 * cleanup job in exchange for surviving a restart mid-game. The consequence is
 * that the app must run as a single process — see README, "Deployment runtime".
 * The global also keeps one connection (and the sessions) alive across dev HMR.
 */
export const getDb = createServerOnlyFn((): Db => {
  const g = globalThis as { __wyrDb?: Db }
  g.__wyrDb ??= connect()
  return g.__wyrDb
})
