import Link from 'next/link'
import Image from 'next/image'

export function WorkshopBanner() {
  return (
    <Link
      href="/workshop"
      className="block mb-12 group rounded-xl overflow-hidden border-2 border-yellow-600/40 hover:border-yellow-500 transition-all shadow-lg hover:shadow-yellow-600/20"
      aria-label="Register for the 9-Day Lifestacks Workshop in Columbus, Ohio — $649"
    >
      <div className="relative w-full aspect-[16/9]">
        <Image
          src="/workshop-banner.png"
          alt="9-Day Lifestacks Workshop — Columbus, Ohio — July 29 to August 7, 2026 — $649 Registration"
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 1152px"
        />
      </div>
    </Link>
  )
}
