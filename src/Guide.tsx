import type { ReactNode } from 'react'
import mascot from './assets/mascot.png'
import Footer from './Footer'

/** Пошаговая инструкция в духе страницы Notion: иконка, заголовок, свойства, callout, шаги и тогглы. */
export default function Guide({ onBack, onDemo }: { onBack: () => void; onDemo: () => void }) {
  return (
    <div className="min-h-screen bg-white text-notion-ink">
      <nav className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-notion-border/70 bg-white/90 px-3 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-1 text-[14px]">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-notion-muted hover:bg-notion-surface active:bg-notion-border/60"
          >
            <ArrowLeft />
            Калькулятор
          </button>
          <span className="hidden text-notion-subtle sm:inline">/</span>
          <span className="hidden min-w-0 items-center sm:flex gap-1.5 truncate rounded-md px-2 py-1 font-medium">
            <img src={mascot} alt="" className="h-4 w-4 rounded-[3px]" />
            <span className="truncate">Как пользоваться</span>
          </span>
        </div>
        <button
          onClick={onDemo}
          className="shrink-0 rounded-md bg-notion-blue px-3 py-1.5 text-[14px] font-medium text-white hover:bg-[#0075de] active:bg-[#005bab]"
        >
          Открыть пример
        </button>
      </nav>

      <article className="mx-auto max-w-[708px] px-6 pt-14 pb-28 sm:pt-20">
        <img src={mascot} alt="" className="-ml-1 h-[78px] w-[78px] rounded-xl object-cover" />
        <h1 className="mt-4 text-[34px] leading-[1.15] font-bold tracking-[-0.025em] sm:text-[40px]">Как пользоваться калькулятором</h1>

        <dl className="mt-6 space-y-1 text-[14px]">
          <Property label="Для кого">Студенты</Property>
          <Property label="Время">2 минуты</Property>
          <Property label="Что узнаешь">
            <Tag>сколько нужно на сессии</Tag>
            <Tag tone="green">шансы на стипендию</Tag>
          </Property>
        </dl>

        <hr className="my-8 border-notion-border" />

        <Callout icon={<Bulb />}>
          Калькулятор берёт оценки за семестр и показывает, <b className="font-semibold">какой минимальный балл нужен на сессии</b>, чтобы получить нужную
          итоговую оценку. Не хочется разбираться? Нажми{' '}
          <button onClick={onDemo} className="font-medium text-notion-blue underline decoration-notion-blue/30 underline-offset-2 hover:decoration-notion-blue">
            «Открыть пример»
          </button>{' '}
          — таблица заполнится выдуманными оценками, и всё будет видно сразу.
        </Callout>

        <Step n={1} title="Впиши оценки за каждую неделю">
          <P>
            В таблице 15 столбцов — это недели, и три строки: <b className="font-semibold">Лекции</b>, <b className="font-semibold">Практика</b> и{' '}
            <b className="font-semibold">СРО</b>. Нажми на клетку и впиши балл от 0 до 100 — так же, как он стоит в электронном журнале.
          </P>
          <Figure caption="Недели 1–7 идут в первый рейтинг (Р1), недели 8–15 — во второй (Р2).">
            <MiniTable />
          </Figure>
        </Step>

        <Step n={2} title="Отметь н.я. и н.п.">
          <P>В журнале бывают не только цифры. Вот что писать в клетку:</P>
          <SimpleTable
            head={['В журнале', 'Что писать', 'Как считается']}
            rows={[
              ['Балл 0–100', 'Как есть, например 85', 'Обычная оценка'],
              ['н.я. — не явился', '0', 'Как ноль'],
              ['н.п. — не предусмотрено', 'Букву «н»', 'Не учитывается'],
              ['Ещё нет оценки', 'Ничего', 'Не учитывается'],
            ]}
          />
          <P>
            Если н.п. много, включи переключатель <Code>Отметить н.п.</Code> над таблицей и просто нажимай на нужные клетки. Чтобы убрать н.п., нажми на клетку
            ещё раз или сотри её.
          </P>
        </Step>

        <Step n={3} title="Добавь РК1 и РК2">
          <P>Под таблицей два поля для рубежного контроля: РК1 сдаёшь после 7 недели, РК2 — после 15.</P>
          <Figure>
            <div className="divide-y divide-notion-border overflow-hidden rounded-lg border border-notion-border bg-white text-[15px]">
              <MockRow label="РК1" hint="после 7 недели" value="82" />
              <MockRow label="РК2" hint="после 15 недели" value="78" />
            </div>
          </Figure>
        </Step>

        <Step n={4} title="Выбери, какую оценку хочешь">
          <P>
            Нажми на букву — или впиши точный итоговый балл в поле <Code>Или точный балл</Code>.
          </P>
          <Figure>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                ['A', 95],
                ['A−', 90],
                ['B+', 85],
                ['B', 80],
                ['B−', 75],
              ].map(([l, m]) => (
                <div
                  key={l}
                  className={`flex flex-col items-center rounded-md border py-1.5 ${l === 'A−' ? 'border-notion-blue bg-notion-blue text-white' : 'border-notion-border bg-white'}`}
                >
                  <span className="text-[15px] font-semibold">{l}</span>
                  <span className={`text-[11px] tabular-nums ${l === 'A−' ? 'text-white/75' : 'text-notion-muted'}`}>{m}+</span>
                </div>
              ))}
            </div>
          </Figure>
        </Step>

        <Step n={5} title="Посмотри, сколько нужно на сессии">
          <P>
            В блоке <b className="font-semibold">«Результат»</b> появится балл, который нужно набрать на сессии. Цвет подскажет, насколько это реально:
          </P>
          <Figure>
            <div className="rounded-lg border border-notion-border bg-white px-4 pt-4 pb-3.5">
              <div className="text-[13px] text-notion-muted">Нужно набрать на сессии</div>
              <div className="mt-0.5 text-[40px] leading-none font-bold tracking-[-0.03em] text-ios-orange tabular-nums">96,4</div>
              <div className="mt-2 text-[13px] text-notion-muted">Реально, но придётся постараться.</div>
            </div>
          </Figure>
          <ul className="mt-4 space-y-2 text-[16px] leading-[1.6]">
            <Legend color="bg-ios-green">
              <b className="font-semibold">Зелёный</b> — вполне реально. Если написано 50, достаточно просто сдать.
            </Legend>
            <Legend color="bg-ios-orange">
              <b className="font-semibold">Оранжевый</b> — нужно больше 85, придётся готовиться всерьёз.
            </Legend>
            <Legend color="bg-ios-red">
              <b className="font-semibold">Красный</b> — недопуск (Р1 или Р2 ниже 50) или даже 100 на сессии не хватит.
            </Legend>
          </ul>
        </Step>

        <Step n={6} title="Проверь стипендию и поделись">
          <P>
            Блок <b className="font-semibold">«Стипендия»</b> сразу показывает, сколько нужно на сессии для итога от 70 и от 90. Кнопка <Code>Поделиться</Code>{' '}
            вверху делает скриншот всей страницы — его можно скинуть в чат группы.
          </P>
        </Step>

        <h2 className="mt-14 mb-1 text-[24px] leading-tight font-bold tracking-[-0.015em]">Вопросы</h2>
        <div className="mt-3">
          <Toggle title="Как это считается?">
            <P>Текущий контроль (ТК) — среднее по каждой строке, взвешенное по долям: лекции 20%, практика 50%, СРО 30%. Пустые и н.п. клетки пропускаются.</P>
            <pre className="mt-3 overflow-x-auto rounded-md bg-notion-surface px-4 py-3 font-mono text-[13.5px] leading-[1.7] text-notion-ink">
              {'Р1 = (ТК за 1–7 недели + РК1) / 2\nР2 = (ТК за 8–15 недели + РК2) / 2\nРейтинг допуска = (Р1 + Р2) / 2\nИтог = рейтинг × 0,6 + сессия × 0,4'}
            </pre>
          </Toggle>
          <Toggle title="Мои оценки сохранятся?">
            <P>Да, они хранятся в этом браузере на твоём устройстве. Никуда не отправляются. На другом телефоне или ноутбуке их не будет.</P>
          </Toggle>
          <Toggle title="Я открыл пример — мои оценки пропали?">
            <P>
              Нет. Пока открыт пример, сверху висит плашка с кнопкой <Code>Вернуть мои оценки</Code> — нажми её, и всё вернётся как было.
            </P>
          </Toggle>
          <Toggle title="Почему минимум на сессии — 50?">
            <P>Чтобы сдать экзамен, на нём нужно набрать хотя бы 50 баллов. Поэтому даже при высоком рейтинге калькулятор не покажет меньше 50.</P>
          </Toggle>
        </div>

        <div className="mt-14 flex flex-col items-start gap-4 rounded-xl border border-notion-border p-6 sm:flex-row sm:items-center">
          <img src={mascot} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          <div className="flex-1">
            <div className="text-[16px] font-semibold">Проще один раз увидеть</div>
            <div className="mt-0.5 text-[14px] leading-[1.45] text-notion-muted">Откроем калькулятор с готовыми оценками — потом можно ввести свои.</div>
          </div>
          <button
            onClick={onDemo}
            className="shrink-0 rounded-md bg-notion-blue px-3.5 py-2 text-[14px] font-medium text-white hover:bg-[#0075de] active:bg-[#005bab]"
          >
            Открыть пример
          </button>
        </div>

        <Footer />
      </article>
    </div>
  )
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <dt className="w-28 shrink-0 sm:w-36 text-notion-muted">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">{children}</dd>
    </div>
  )
}

function Tag({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' }) {
  const cls = tone === 'green' ? 'bg-[#e8f5ea] text-[#1c6b2e]' : 'bg-[#e6f1fc] text-[#0b5cad]'
  return <span className={`rounded-[4px] px-1.5 py-0.5 text-[13px] ${cls}`}>{children}</span>
}

function Callout({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md bg-notion-surface px-4 py-4 text-[16px] leading-[1.6]">
      <span className="mt-0.5 shrink-0 text-[#dd5b00]">{icon}</span>
      <div>{children}</div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-3">
        <span className="flex h-6 w-6 shrink-0 translate-y-[-2px] items-center justify-center self-center rounded-full bg-notion-ink text-[13px] font-semibold text-white tabular-nums">
          {n}
        </span>
        <h2 className="text-[22px] leading-tight font-bold tracking-[-0.015em] sm:text-[24px]">{title}</h2>
      </div>
      <div className="sm:pl-9">{children}</div>
    </section>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[16px] leading-[1.6]">{children}</p>
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-[4px] bg-notion-surface px-1.5 py-0.5 font-mono text-[0.85em] text-[#eb5757]">{children}</code>
}

function Figure({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="mt-4">
      <div className="rounded-lg bg-notion-soft p-3 sm:p-4">{children}</div>
      {caption && <figcaption className="mt-2 text-[14px] leading-[1.45] text-notion-muted">{caption}</figcaption>}
    </figure>
  )
}

function MiniTable() {
  const rows: [string, string[]][] = [
    ['Лек', ['100', '95', '100', 'н.п.', '90']],
    ['Прак', ['85', '90', '80', '95', '']],
    ['СРО', ['90', '85', '100', '95', '']],
  ]
  return (
    <div className="overflow-hidden rounded-lg border border-notion-border bg-white">
      <table className="w-full border-separate border-spacing-0 text-[14px] tabular-nums">
        <thead>
          <tr>
            <th className="bg-notion-soft py-2 pl-3 text-left text-[12px] font-medium text-notion-muted">Неделя</th>
            {[1, 2, 3, 4, 5].map((w) => (
              <th key={w} className="border-l border-notion-border bg-notion-soft py-2 text-center text-[12px] font-medium text-notion-muted">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, vals], ri) => (
            <tr key={name}>
              <th className="border-t border-notion-border py-1 pr-2 pl-3 text-left font-medium">{name}</th>
              {vals.map((v, i) => {
                const focus = ri === 1 && i === 4
                return (
                  <td key={i} className="border-t border-l border-notion-border p-0">
                    <div
                      className={`flex h-9 items-center justify-center ${
                        v === 'н.п.' ? 'bg-notion-surface text-[11px] text-notion-muted' : focus ? 'bg-notion-blue-soft shadow-[inset_0_0_0_2px_#097fe8]' : ''
                      }`}
                    >
                      {v || (focus ? <span className="h-4 w-px animate-pulse bg-notion-blue" /> : <span className="text-notion-subtle/70">·</span>)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MockRow({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="font-medium">
        {label}
        <span className="ml-2 text-[14px] font-normal text-notion-muted">{hint}</span>
      </span>
      <span className="flex h-8 w-20 items-center justify-end rounded-md border border-notion-border px-2.5 tabular-nums">{value}</span>
    </div>
  )
}

function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-[14px] leading-[1.45]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border border-notion-border bg-notion-soft px-3 py-2 text-left font-medium text-notion-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className={`border border-notion-border px-3 py-2 ${i === 0 ? 'font-medium' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Legend({ color, children }: { color: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-[9px] h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <span>{children}</span>
    </li>
  )
}

function Toggle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-md">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1.5 pr-2 pl-1 text-[16px] font-medium hover:bg-notion-surface [&::-webkit-details-marker]:hidden">
        <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0 text-notion-muted transition-transform group-open:rotate-90" aria-hidden>
          <path d="M9 6.5v11l8-5.5-8-5.5Z" fill="currentColor" />
        </svg>
        {title}
      </summary>
      <div className="pb-3 pl-7">{children}</div>
    </details>
  )
}

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

function Bulb() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.74c.62.45 1 1.16 1 1.93V17h6v-.33c0-.77.38-1.48 1-1.93A7 7 0 0 0 12 2Z" />
    </svg>
  )
}
