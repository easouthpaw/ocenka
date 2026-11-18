const TELEGRAM_URL = 'https://t.me/easouthpaw'

/** Общий низ страницы: про хранение данных и связь с автором. */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-notion-border pt-6">
      <div className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-notion-muted">
        <LockIcon />
        <p>Все оценки хранятся только локально — в этом браузере на твоём устройстве. Они никуда не отправляются, и их никто, кроме тебя, не видит.</p>
      </div>
      <div data-no-capture className="mt-5 flex flex-col gap-3 rounded-md bg-notion-surface px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-notion-ink">Есть идея, как сделать лучше?</div>
          <div className="mt-0.5 text-[14px] leading-[1.45] text-notion-muted">Нашёл ошибку или не хватает чего-то — напиши в Telegram.</div>
        </div>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-notion-ink px-3.5 py-2 text-[14px] font-medium text-white hover:bg-black sm:self-center"
        >
          <TelegramIcon />
          Написать в Telegram
        </a>
      </div>
    </footer>
  )
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[3px] shrink-0"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.94 4.3a1 1 0 0 0-1.33-1.1L2.66 10.1a1 1 0 0 0 .05 1.88l4.4 1.4 1.7 5.36a1 1 0 0 0 1.66.42l2.47-2.38 4.33 3.18a1 1 0 0 0 1.57-.6l3.1-15.06ZM9.6 13.66l8.05-6.1-6.43 7.2-.27 2.6-1.35-3.7Z" />
    </svg>
  )
}
