import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { toBlob } from 'html-to-image'
import mascot from './assets/mascot.png'
import Guide from './Guide'
import Footer from './Footer'

const WEEKS = 15
const FIRST_HALF = 7 // недели 1–7 → Р1, 8–15 → Р2
const NP = 'np' // «не предусмотрено» — клетка не учитывается

const ROWS = [
  { id: 'lec', name: 'Лекции', short: 'Лек', weight: 0.2 },
  { id: 'prac', name: 'Практика', short: 'Прак', weight: 0.5 },
  { id: 'sro', name: 'СРО', short: 'СРО', weight: 0.3 },
] as const

type RowId = (typeof ROWS)[number]['id']
type Grid = Record<RowId, string[]>

const GRADES = [
  { letter: 'A', min: 95 },
  { letter: 'A−', min: 90 },
  { letter: 'B+', min: 85 },
  { letter: 'B', min: 80 },
  { letter: 'B−', min: 75 },
  { letter: 'C+', min: 70 },
  { letter: 'C', min: 65 },
  { letter: 'C−', min: 60 },
  { letter: 'D+', min: 55 },
  { letter: 'D', min: 50 },
]

const SCHOLARSHIPS = [
  { name: 'Стипендия', min: 70 },
  { name: 'Повышенная стипендия', min: 90 },
]

const STORAGE_KEY = 'enu-exam-calc-v1'
const DEMO_KEY = 'enu-exam-calc-demo-v1'
const CAPTURE_WIDTH = 900

type State = { grid: Grid; rk1: string; rk2: string; target: string }

const emptyState = (): State => ({
  grid: { lec: Array(WEEKS).fill(''), prac: Array(WEEKS).fill(''), sro: Array(WEEKS).fill('') },
  rk1: '',
  rk2: '',
  target: '90',
})

/** Выдуманный, но правдоподобный семестр — чтобы показать, как всё работает. */
const demoState = (): State => ({
  grid: {
    lec: ['100', '95', '100', NP, '90', '100', '95', '100', '90', NP, '100', '95', '100', '90', '100'],
    prac: ['85', '90', '80', '95', '88', '92', '90', '85', '80', '90', '88', '95', '85', '90', '92'],
    sro: ['90', '85', '100', '95', '90', NP, '100', '95', '90', '100', '85', '90', '95', NP, '100'],
  },
  rk1: '82',
  rk2: '78',
  target: '90',
})

const isEmptyState = (s: State) => !s.rk1 && !s.rk2 && ROWS.every((r) => s.grid[r.id].every((v) => v === ''))

/** undefined — пример не открыт; null — открыт поверх пустой таблицы; State — свои оценки, к которым можно вернуться. */
type DemoBackup = State | null | undefined

function loadDemoBackup(): DemoBackup {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? (JSON.parse(raw) as { backup: State | null }).backup : undefined
  } catch {
    return undefined
  }
}

const pageFromHash = () => (location.hash === '#guide' ? 'guide' : 'calc')

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as State
    const base = emptyState()
    for (const r of ROWS) {
      if (Array.isArray(parsed.grid?.[r.id])) base.grid[r.id] = base.grid[r.id].map((_, i) => sanitize(parsed.grid[r.id][i]))
    }
    return { ...base, rk1: sanitize(parsed.rk1), rk2: sanitize(parsed.rk2), target: parsed.target === undefined ? '90' : sanitize(parsed.target) }
  } catch {
    return emptyState()
  }
}

/** Оставляет только число 0–100 с одним знаком после точки: без ведущих нулей (050 → 50), .5 → 0.5, больше 100 → 100. */
function clean(raw: string) {
  const v = raw.replace(',', '.').replace(/[^0-9.]/g, '')
  if (v === '') return ''
  const [rawInt, ...rest] = v.split('.')
  const int = rawInt.replace(/^0+(?=\d)/, '') || '0'
  if (parseFloat(int) >= 100) return '100'
  return rest.length ? `${int}.${rest.join('').slice(0, 1)}` : int
}

/** При выходе из поля: убирает точку и ноль в конце (85. → 85, 85.0 → 85). */
const tidy = (v: string) => v.replace(/\.0?$/, '')

const sanitize = (v: unknown) => (v === NP ? NP : typeof v === 'string' ? tidy(clean(v)) : '')

/** Буква «н», «n» или «-» в клетке превращает её в н.п. */
const isNpInput = (raw: string) => /[нНnN\-–]/.test(raw)

const num = (s: string) => {
  if (s === NP) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

const fmt = (n: number | null, d = 1) => (n === null ? '—' : (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ','))

/** ТК за период: взвешенное среднее по строкам, где есть хотя бы одна оценка. Пустые и н.п. клетки не считаются. */
function currentControl(grid: Grid, from: number, to: number) {
  let sum = 0
  let weights = 0
  for (const r of ROWS) {
    const vals = grid[r.id]
      .slice(from, to)
      .map(num)
      .filter((n): n is number => n !== null)
    if (!vals.length) continue
    sum += (vals.reduce((a, b) => a + b, 0) / vals.length) * r.weight
    weights += r.weight
  }
  return weights ? sum / weights : null
}

function letterFor(score: number) {
  return GRADES.find((g) => score >= g.min)?.letter ?? 'F'
}

type Need = { kind: 'min' } | { kind: 'score'; value: number } | { kind: 'impossible'; max: number } | { kind: 'blocked' }

/** Сколько нужно на сессии, чтобы итог был не ниже goal. */
function needFor(goal: number, avg: number, admitted: boolean): Need {
  if (!admitted) return { kind: 'blocked' }
  const session = (goal - avg * 0.6) / 0.4
  if (session > 100) return { kind: 'impossible', max: avg * 0.6 + 40 }
  if (session <= 50) return { kind: 'min' }
  return { kind: 'score', value: Math.ceil(session * 10) / 10 }
}

export default function App() {
  const [page, setPage] = useState(pageFromHash)
  const [state, setState] = useState<State>(loadState)
  const [demoBackup, setDemoBackup] = useState<DemoBackup>(loadDemoBackup)
  const [npMode, setNpMode] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const pageRef = useRef<HTMLElement>(null)
  const { grid, rk1, rk2, target } = state
  const demo = demoBackup !== undefined

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (demoBackup === undefined) localStorage.removeItem(DEMO_KEY)
    else localStorage.setItem(DEMO_KEY, JSON.stringify({ backup: demoBackup }))
  }, [demoBackup])

  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(id)
  }, [toast])

  const setCell = (row: RowId, week: number, value: string) =>
    setState((s) => ({
      ...s,
      grid: { ...s.grid, [row]: s.grid[row].map((v, i) => (i === week ? value : v)) },
    }))

  const onCellChange = (row: RowId, week: number, raw: string) => setCell(row, week, isNpInput(raw) ? NP : clean(raw))

  // В клетке с н.п.: стереть — очистить, цифра — заменить оценкой.
  const onNpKeyDown = (row: RowId, week: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      setCell(row, week, '')
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      setCell(row, week, e.key)
    }
  }

  const calc = useMemo(() => {
    const tk1 = currentControl(grid, 0, FIRST_HALF)
    const tk2 = currentControl(grid, FIRST_HALF, WEEKS)
    const rk1n = num(rk1)
    const rk2n = num(rk2)
    const r1 = tk1 !== null && rk1n !== null ? (tk1 + rk1n) / 2 : null
    const r2 = tk2 !== null && rk2n !== null ? (tk2 + rk2n) / 2 : null
    const avg = r1 !== null && r2 !== null ? (r1 + r2) / 2 : null
    const admitted = r1 !== null && r2 !== null && r1 >= 50 && r2 >= 50
    return { tk1, tk2, r1, r2, avg, admitted, t: num(target) }
  }, [grid, rk1, rk2, target])

  const missing =
    calc.tk1 === null
      ? 'Заполни оценки за 1–7 недели'
      : rk1 === ''
        ? 'Укажи балл за РК1'
        : calc.tk2 === null
          ? 'Заполни оценки за 8–15 недели'
          : rk2 === ''
            ? 'Укажи балл за РК2'
            : null

  const reset = () => {
    if (!confirm('Очистить все оценки?')) return
    setState(emptyState())
    setDemoBackup(undefined)
  }

  const showDemo = () => {
    // Свои оценки не теряются: их можно вернуть из плашки примера.
    if (!demo) setDemoBackup(isEmptyState(state) ? null : state)
    setState(demoState())
    setNpMode(false)
    setToast('Заполнили примером')
  }

  const exitDemo = () => {
    setState(demoBackup ?? emptyState())
    setDemoBackup(undefined)
  }

  const openDemoFromGuide = () => {
    showDemo()
    location.hash = ''
  }

  const share = async () => {
    const node = pageRef.current
    if (!node || sharing) return
    setSharing(true)
    // Снимок делается в ширину десктопа, чтобы таблица влезла целиком даже с телефона.
    const makeBlob = async () => {
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: CAPTURE_WIDTH,
        height: node.scrollHeight,
        style: { width: `${CAPTURE_WIDTH}px`, maxWidth: 'none', margin: '0' },
        filter: (el) => !(el instanceof HTMLElement && el.dataset.noCapture !== undefined),
      })
      if (!blob) throw new Error('empty')
      return blob
    }
    try {
      // Promise передаётся сразу, иначе Safari теряет разрешение на запись в буфер.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': makeBlob() })])
      setToast('Скриншот скопирован')
    } catch {
      try {
        const blob = await makeBlob()
        const file = new File([blob], 'ocenki.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
        } else {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(file)
          a.download = file.name
          a.click()
          URL.revokeObjectURL(a.href)
          setToast('Скриншот сохранён')
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') setToast('Не получилось сделать скриншот')
      }
    } finally {
      setSharing(false)
    }
  }

  if (page === 'guide') return <Guide onBack={() => (location.hash = '')} onDemo={openDemoFromGuide} />

  return (
    <div className="min-h-screen bg-white text-notion-ink">
      <nav className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-notion-border/70 bg-white/90 px-3 backdrop-blur sm:px-4">
        <span className="flex min-w-0 items-center gap-1.5 truncate rounded-md px-2 py-1 text-[14px] font-medium">
          <img src={mascot} alt="" className="h-4 w-4 rounded-[3px]" />
          <span className="truncate">Калькулятор сессии</span>
        </span>
        <button
          onClick={share}
          disabled={sharing}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[14px] text-notion-muted hover:bg-notion-surface active:bg-notion-border/60 disabled:opacity-50"
        >
          <ShareIcon />
          {sharing ? 'Готовлю…' : 'Поделиться'}
        </button>
      </nav>

      <main ref={pageRef} className="mx-auto max-w-[900px] bg-white px-5 pt-12 pb-20 sm:px-6 sm:pt-16">
        <header>
          <img src={mascot} alt="" className="-ml-1 h-[78px] w-[78px] rounded-xl object-cover" />
          <h1 className="mt-4 text-[34px] leading-[1.15] font-bold tracking-[-0.025em] sm:text-[40px]">Сколько нужно на сессии</h1>
          <p className="mt-2 text-[16px] leading-[1.6] text-notion-muted">Заполни оценки за семестр и выбери, какую итоговую хочешь.</p>
          <div data-no-capture className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={showDemo}
              className="flex items-center gap-2 rounded-md bg-notion-blue px-3.5 py-2 text-[14px] font-medium text-white hover:bg-[#0075de] active:bg-[#005bab]"
            >
              <PlayIcon />
              Показать на примере
            </button>
            <a
              href="#guide"
              className="flex items-center gap-2 rounded-md border border-notion-border px-3.5 py-2 text-[14px] font-medium hover:bg-notion-soft active:bg-notion-surface"
            >
              <BookIcon />
              Как пользоваться
            </a>
          </div>
        </header>

        {demo && (
          <div data-no-capture className="mt-8 flex flex-col gap-3 rounded-md bg-notion-surface px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-3">
              <span className="mt-1 shrink-0 text-notion-blue">
                <PlayIcon />
              </span>
              <div className="text-[15px] leading-[1.55]">
                <b className="font-semibold">Это пример с выдуманными оценками.</b>{' '}
                <span className="text-notion-muted">Пролистай вниз до «Результата» — там видно, сколько нужно на сессии. Попробуй поменять пару клеток.</span>
              </div>
            </div>
            <button
              onClick={exitDemo}
              className="shrink-0 self-start rounded-md border border-notion-border bg-white px-3 py-1.5 text-[14px] font-medium hover:bg-notion-soft sm:self-center"
            >
              {demoBackup ? 'Вернуть мои оценки' : 'Ввести свои'}
            </button>
          </div>
        )}

        <hr className="mt-10 border-notion-border" />

        {/* Таблица */}
        <Section
          title="Оценки по неделям"
          right={
            <button
              data-no-capture
              onClick={reset}
              className="rounded-md px-2 py-1 text-[14px] text-notion-muted hover:bg-notion-surface active:bg-notion-border/60"
            >
              Очистить
            </button>
          }
        >
          <div className="overflow-hidden rounded-lg border border-notion-border">
            <div data-no-capture className="flex items-center justify-between gap-3 border-b border-notion-border px-3 py-2">
              <div className="flex rounded-md bg-notion-surface p-0.5 text-[13px] font-medium">
                <Segment active={!npMode} onClick={() => setNpMode(false)}>
                  Оценки
                </Segment>
                <Segment active={npMode} onClick={() => setNpMode(true)}>
                  Отметить н.п.
                </Segment>
              </div>
              {npMode && <span className="text-[13px] text-notion-muted">Нажми на клетку</span>}
            </div>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full border-separate border-spacing-0 text-[15px] tabular-nums">
                <thead>
                  <tr className="text-[12px] text-notion-muted">
                    <th className="sticky left-0 z-10 bg-notion-soft" />
                    <th colSpan={FIRST_HALF} className="border-l border-notion-border bg-notion-soft pt-2 font-medium">
                      Р1 · недели 1–7
                    </th>
                    <th colSpan={WEEKS - FIRST_HALF} className="border-l border-[#cfccc8] bg-notion-soft pt-2 font-medium">
                      Р2 · недели 8–15
                    </th>
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-10 bg-notion-soft py-2 pr-2 pl-3 text-left text-[13px] font-medium text-notion-muted">Неделя</th>
                    {Array.from({ length: WEEKS }, (_, w) => (
                      <th
                        key={w}
                        className={`min-w-11 border-l bg-notion-soft py-2 text-center text-[13px] font-medium text-notion-muted ${w === FIRST_HALF ? 'border-[#cfccc8]' : 'border-notion-border'}`}
                      >
                        {w + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.id}>
                      <th className="sticky left-0 z-10 border-t border-notion-border bg-white py-0 pr-3 pl-3 text-left font-medium whitespace-nowrap">
                        <span className="sm:hidden">{r.short}</span>
                        <span className="hidden sm:inline">{r.name}</span>
                        <span className="ml-1.5 text-[12px] font-normal text-notion-subtle">{Math.round(r.weight * 100)}%</span>
                      </th>
                      {grid[r.id].map((v, w) => {
                        const np = v === NP
                        return (
                          <td
                            key={w}
                            className={`border-t border-l p-0 ${w === FIRST_HALF ? 'border-l-[#cfccc8] border-t-notion-border' : 'border-notion-border'}`}
                          >
                            <input
                              value={np ? 'н.п.' : v}
                              readOnly={npMode}
                              onChange={(e) => !np && onCellChange(r.id, w, e.target.value)}
                              onKeyDown={(e) => np && onNpKeyDown(r.id, w, e)}
                              onBlur={() => !np && tidy(v) !== v && setCell(r.id, w, tidy(v))}
                              onClick={() => npMode && setCell(r.id, w, np ? '' : NP)}
                              inputMode={npMode ? 'none' : 'decimal'}
                              aria-label={`${r.name}, неделя ${w + 1}`}
                              placeholder="·"
                              className={`block h-10 w-full min-w-11 text-center outline-none placeholder:text-notion-subtle/70 ${np ? 'bg-notion-surface text-[12px] text-notion-muted' : 'bg-transparent'
                                } ${npMode ? 'cursor-pointer caret-transparent hover:bg-notion-surface' : 'focus:bg-notion-blue-soft focus:shadow-[inset_0_0_0_2px_#097fe8]'}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-notion-border border-t border-notion-border">
              <FieldRow label="РК1" hint="после 7 недели" value={rk1} onChange={(v) => setState((s) => ({ ...s, rk1: clean(v) }))} />
              <FieldRow label="РК2" hint="после 15 недели" value={rk2} onChange={(v) => setState((s) => ({ ...s, rk2: clean(v) }))} />
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-[1.5] text-notion-muted">
            <li>
              <b className="font-medium text-notion-ink">н.я.</b> (не явился) — ставь <b className="font-medium text-notion-ink">0</b>.
            </li>
            <li>
              <b className="font-medium text-notion-ink">н.п.</b> (не предусмотрено) — не учитывается. Набери «н» в клетке или включи «Отметить н.п.».
            </li>
            <li>Пустые клетки тоже не учитываются.</li>
          </ul>
        </Section>

        {/* Цель */}
        <Section title="Итоговая оценка" desc="Какую оценку хочешь получить по предмету.">
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {GRADES.map((g) => {
              const active = calc.t !== null && letterFor(calc.t) === g.letter
              return (
                <button
                  key={g.letter}
                  onClick={() => setState((s) => ({ ...s, target: String(g.min) }))}
                  className={`flex flex-col items-center rounded-md border py-2 transition-colors ${active ? 'border-notion-blue bg-notion-blue text-white' : 'border-notion-border hover:bg-notion-soft active:bg-notion-surface'
                    }`}
                >
                  <span className="text-[16px] font-semibold">{g.letter}</span>
                  <span className={`text-[12px] tabular-nums ${active ? 'text-white/75' : 'text-notion-muted'}`}>{g.min}+</span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 rounded-lg border border-notion-border">
            <FieldRow label="Или точный итоговый балл" value={target} onChange={(v) => setState((s) => ({ ...s, target: clean(v) }))} />
          </div>
        </Section>

        {/* Результат */}
        <Section title="Результат">
          <Result calc={calc} missing={missing ?? (calc.t === null ? 'Выбери итоговую оценку' : null)} />
        </Section>

        {/* Стипендия */}
        <Section title="Стипендия" desc="Сколько нужно на сессии, чтобы итог по предмету был не ниже 70 или 90.">
          <div className="divide-y divide-notion-border overflow-hidden rounded-lg border border-notion-border">
            {SCHOLARSHIPS.map((s) => (
              <ScholarshipRow key={s.min} name={s.name} min={s.min} calc={calc} missing={missing} />
            ))}
          </div>
        </Section>

        <Footer />
      </main>

      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 bottom-8 z-40 flex justify-center transition-all duration-200 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
      >
        <div className="rounded-md bg-notion-ink px-4 py-2 text-[14px] text-white shadow-lg">{toast}</div>
      </div>
    </div>
  )
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[5px] px-3 py-1 transition-colors ${active ? 'bg-white text-notion-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-notion-muted hover:text-notion-ink'}`}
    >
      {children}
    </button>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function Section({ title, desc, right, children }: { title: string; desc?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[22px] leading-tight font-bold tracking-[-0.015em] sm:text-[24px]">{title}</h2>
        {right}
      </div>
      {desc && <p className="-mt-1 mb-3 text-[15px] leading-[1.5] text-notion-muted">{desc}</p>}
      {children}
    </section>
  )
}

function FieldRow({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-[15px] font-medium">
        {label}
        {hint && <span className="ml-2 text-[14px] font-normal text-notion-muted">{hint}</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => tidy(value) !== value && onChange(tidy(value))}
        inputMode="decimal"
        placeholder="0–100"
        className="h-9 w-24 shrink-0 rounded-md border border-notion-border bg-white px-2.5 text-right text-[15px] tabular-nums outline-none placeholder:text-notion-subtle focus:border-notion-blue focus:ring-2 focus:ring-notion-blue/20"
      />
    </label>
  )
}

type Calc = {
  tk1: number | null
  tk2: number | null
  r1: number | null
  r2: number | null
  avg: number | null
  admitted: boolean
  t: number | null
}

function Result({ calc, missing }: { calc: Calc; missing: string | null }) {
  const { avg, r1, r2, t, admitted } = calc
  let big = '—'
  let tone = 'text-notion-subtle'
  let note = missing ?? ''

  if (!missing && avg !== null && t !== null) {
    const need = needFor(t, avg, admitted)
    if (need.kind === 'blocked') {
      tone = 'text-ios-red'
      big = 'Недопуск'
      note = 'Р1 и Р2 должны быть не ниже 50.'
    } else if (need.kind === 'impossible') {
      tone = 'text-ios-red'
      big = 'Нет шансов'
      note = `Даже со 100 на сессии выйдет ${fmt(need.max)}.`
    } else if (need.kind === 'min') {
      tone = 'text-ios-green'
      big = '50'
      note = 'Достаточно просто сдать сессию — минимум 50.'
    } else {
      tone = need.value > 85 ? 'text-ios-orange' : 'text-ios-green'
      big = fmt(need.value)
      note = need.value > 85 ? 'Реально, но придётся постараться.' : 'Вполне реально.'
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-notion-border">
      <div className="px-5 pt-5 pb-4">
        <div className="text-[14px] text-notion-muted">Нужно набрать на сессии</div>
        <div className={`mt-1 text-[56px] leading-none font-bold tracking-[-0.03em] tabular-nums ${tone}`}>{big}</div>
        <div className="mt-3 text-[15px] text-notion-muted">{note}</div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-notion-border border-t border-notion-border text-center tabular-nums">
        <Stat label="Р1" value={fmt(r1)} />
        <Stat label="Р2" value={fmt(r2)} />
        <Stat label="Рейтинг допуска" value={fmt(avg)} />
      </div>
      <div className="border-t border-notion-border bg-notion-soft px-5 py-3 font-mono text-[12.5px] leading-[1.6] text-notion-muted">
        Р = (ТК + РК) / 2 · Итог = рейтинг × 0,6 + сессия × 0,4
      </div>
    </div>
  )
}

function ScholarshipRow({ name, min, calc, missing }: { name: string; min: number; calc: Calc; missing: string | null }) {
  let value = '—'
  let tone = 'text-notion-subtle'
  if (!missing && calc.avg !== null) {
    const need = needFor(min, calc.avg, calc.admitted)
    if (need.kind === 'blocked' || need.kind === 'impossible') {
      value = 'Нет шансов'
      tone = 'text-ios-red'
    } else if (need.kind === 'min') {
      value = 'от 50'
      tone = 'text-ios-green'
    } else {
      value = `от ${fmt(need.value)}`
      tone = need.value > 85 ? 'text-ios-orange' : 'text-ios-green'
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-[15px] font-medium">{name}</div>
        <div className="text-[13px] text-notion-muted">итог от {min}</div>
      </div>
      <div className={`text-[16px] font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <div className="text-[12px] text-notion-muted">{label}</div>
      <div className="mt-0.5 text-[20px] font-semibold">{value}</div>
    </div>
  )
}
