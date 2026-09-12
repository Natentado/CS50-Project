/**
 * A tiny SQLite shell for the vote store, built on the same `node:sqlite` the
 * app uses — so there is nothing to install, here or on the server.
 *
 *   npm run db                          interactive prompt
 *   npm run db -- "SELECT * FROM questions LIMIT 5"
 *   npm run db -- .tables
 *
 * Reads DATABASE_PATH, exactly like src/server/db.ts, so on a server:
 *   DATABASE_PATH=/var/lib/wyr/wyr.db npm run db
 */
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { DatabaseSync } from 'node:sqlite'

const DB_PATH = process.env.DATABASE_PATH ?? 'wyr.db'

if (!existsSync(DB_PATH)) {
  console.error(
    `No database at ${DB_PATH}.\n` +
      'It is created the first time a server function runs — start the app and hit Play,\n' +
      'or set DATABASE_PATH if the file lives somewhere else.',
  )
  process.exit(1)
}

const db = new DatabaseSync(DB_PATH)

const HELP = `.tables           list tables
.schema [table]   show CREATE statements
.help             this
.quit             leave (Ctrl+C also works)

Anything else is run as SQL. In the prompt, statements end at a semicolon.`

// Returns true when the input was a dot command and has been handled.
const runDotCommand = (input) => {
  const [command, argument] = input.split(/\s+/, 2)
  switch (command) {
    case '.tables':
      console.log(
        db
          .prepare(
            `SELECT name FROM sqlite_master
              WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
          )
          .all()
          .map((row) => row.name)
          .join('  '),
      )
      return true
    case '.schema': {
      const rows = argument
        ? db
            .prepare(`SELECT sql FROM sqlite_master WHERE name = ? AND sql IS NOT NULL`)
            .all(argument)
        : db
            .prepare(`SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name`)
            .all()
      if (rows.length === 0) console.log(argument ? `no such table: ${argument}` : 'empty database')
      else console.log(rows.map((row) => `${row.sql};`).join('\n\n'))
      return true
    }
    case '.help':
      console.log(HELP)
      return true
    case '.quit':
    case '.exit':
      return 'quit'
    default:
      return false
  }
}

const runSql = (sql) => {
  const statement = db.prepare(sql)
  // A SELECT (or a RETURNING clause) produces rows; everything else reports counts.
  if (statement.all.length >= 0 && /^\s*(select|pragma|with|explain)\b/i.test(sql)) {
    const rows = statement.all()
    if (rows.length === 0) console.log('(no rows)')
    // Strip the null prototype so console.table renders proper columns.
    else console.table(rows.map((row) => ({ ...row })))
    return
  }
  const { changes, lastInsertRowid } = statement.run()
  console.log(`${changes} row(s) changed` + (lastInsertRowid ? `, last rowid ${lastInsertRowid}` : ''))
}

const execute = (input) => {
  try {
    const handled = runDotCommand(input)
    if (handled === 'quit') return 'quit'
    if (!handled) runSql(input)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
  }
}

const oneShot = process.argv.slice(2).join(' ').trim()
if (oneShot) {
  execute(oneShot.replace(/;\s*$/, ''))
  db.close()
  process.exit(0)
}

console.log(`${DB_PATH} — .help for commands, .quit to leave`)
const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'wyr> ' })
let buffer = ''
rl.prompt()
// Dot commands fire on Enter; SQL waits for a semicolon so queries can span lines.
for await (const line of rl) {
  const trimmed = line.trim()
  if (!buffer && trimmed.startsWith('.')) {
    if (execute(trimmed) === 'quit') break
  } else if (trimmed || buffer) {
    buffer += (buffer ? '\n' : '') + line
    if (buffer.trimEnd().endsWith(';')) {
      execute(buffer.trimEnd().replace(/;$/, ''))
      buffer = ''
    }
  }
  rl.setPrompt(buffer ? '   ...> ' : 'wyr> ')
  rl.prompt()
}
rl.close()
db.close()
