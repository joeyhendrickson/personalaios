import { WORKSHOP_TERMS_HEADER, WORKSHOP_TERMS_SECTIONS } from '@/lib/workshop/terms-content'

export function WorkshopTermsDocument() {
  return (
    <div className="prose prose-lg max-w-none text-black">
      <h1 className="text-3xl font-bold mb-2">{WORKSHOP_TERMS_HEADER.title}</h1>
      <p className="text-gray-600 mb-6">Hosted by {WORKSHOP_TERMS_HEADER.host}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 not-prose text-sm space-y-2">
        <p>
          <span className="font-semibold">Workshop:</span> {WORKSHOP_TERMS_HEADER.workshop}
        </p>
        <p>
          <span className="font-semibold">Host:</span> {WORKSHOP_TERMS_HEADER.host}
        </p>
        <p>
          <span className="font-semibold">Workshop Facilitator:</span>{' '}
          {WORKSHOP_TERMS_HEADER.facilitator}
        </p>
        <p>
          <span className="font-semibold">Workshop Location:</span> {WORKSHOP_TERMS_HEADER.location}
        </p>
        <p>
          <span className="font-semibold">Workshop Dates:</span> {WORKSHOP_TERMS_HEADER.dates}
        </p>
        <p>
          <span className="font-semibold">Check-In:</span> {WORKSHOP_TERMS_HEADER.checkIn}
        </p>
        <p>
          <span className="font-semibold">Checkout:</span> {WORKSHOP_TERMS_HEADER.checkout}
        </p>
      </div>

      {WORKSHOP_TERMS_SECTIONS.map((section) => (
        <section key={section.title} className="mb-8">
          <h2 className="text-xl font-bold mb-3">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mb-3 text-gray-800">
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-800">
              {section.bullets.map((bullet) => (
                <li key={bullet.slice(0, 40)}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
