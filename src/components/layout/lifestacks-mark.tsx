export function LifeStacksMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 51"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ colorScheme: 'only light', filter: 'none' }}
    >
      <g fill="#ffffff">
        <path d="M24 1.2 43 10.7v5.2L24 25.4 5 15.9V10.7L24 1.2Z" />
        <path d="M24 13.4 43 22.9v5.2L24 37.6 5 28.1v-5.2L24 13.4Z" />
        <path d="M24 25.6 43 35.1v5.2L24 49.8 5 40.3v-5.2L24 25.6Z" />
      </g>
    </svg>
  )
}
