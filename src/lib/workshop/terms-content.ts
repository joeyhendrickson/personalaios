import {
  WORKSHOP_CHECK_IN,
  WORKSHOP_CHECKOUT,
  WORKSHOP_DATES,
  WORKSHOP_FACILITATOR,
  WORKSHOP_HOST,
  WORKSHOP_ID_EMAIL,
  WORKSHOP_LOCATION,
  WORKSHOP_TITLE,
} from './constants'

type TermsSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
  subsections?: { title: string; bullets: string[] }[]
}

export const WORKSHOP_TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Agreement',
    paragraphs: [
      'By registering for this workshop, the Registrant acknowledges that they have read, understood, and voluntarily agree to all terms and conditions contained in this Agreement.',
      'This Agreement governs participation in the Lifestacks Workshop, any optional lodging provided during the workshop period, and all coaching sessions associated with the workshop.',
    ],
  },
  {
    title: '2. Purpose of the Workshop',
    paragraphs: [
      'The purpose of this workshop is to provide participants with access to the Lifestacks platform together with individualized coaching intended to assist the Registrant in establishing, configuring, and utilizing the Lifestacks system.',
      'The workshop is educational and instructional in nature.',
      'The workshop is not medical care, mental health counseling, legal advice, financial advice, tax advice, investment advice, or professional consulting.',
      'No representation or guarantee is made regarding any particular business, financial, educational, or personal outcome.',
    ],
  },
  {
    title: '3. Coaching Sessions',
    paragraphs: [
      'Registrant will receive access to coaching throughout the workshop period.',
      'Registrant understands and agrees that:',
    ],
    bullets: [
      'Coaching sessions are flexible.',
      'There is no minimum or maximum number of coaching sessions.',
      'Neither the Coach nor the Registrant is obligated to conduct coaching for any specific duration.',
      'Coaching may occur: in person; by telephone; by video conference; by email; by text message; through the Lifestacks platform; or through any mutually agreed digital communication platform.',
      'Coaching availability is determined solely by the Coach’s schedule during the workshop period.',
      'Registrant understands that coaching does not constitute 24-hour support or an employment relationship.',
    ],
  },
  {
    title: '4. Lifestacks Access',
    paragraphs: [
      'Registrant will receive access to the Lifestacks platform during the workshop.',
      'Registrant agrees that:',
    ],
    bullets: [
      'Access is granted solely for participation in the workshop.',
      'Login credentials are personal and may not be shared.',
      'Registrant will not copy, reproduce, distribute, modify, reverse engineer, decompile, scrape, or otherwise exploit any portion of the Lifestacks platform.',
      'All software, documentation, methodologies, prompts, workflows, templates, graphics, intellectual property, and related materials remain the exclusive property of Lifestacks LLC unless otherwise expressly stated in writing.',
    ],
  },
  {
    title: '5. Case Study Authorization',
    paragraphs: [
      'Registrant understands that participation in the workshop may contribute to future educational materials, demonstrations, product development, or case studies.',
      'Registrant authorizes Lifestacks LLC to use anonymized information relating to: implementation methods; workflows; coaching strategies; lessons learned; screenshots with identifying information removed; configuration examples; feature usage; success metrics; and general participant experiences.',
      'Personally identifying information will not intentionally be published without separate written permission unless required by law.',
    ],
  },
  {
    title: '6. Optional On-Site Stay',
    paragraphs: [
      'Registrant may elect to stay on-site during the workshop.',
      'Lodging is provided solely as an accommodation incidental to workshop participation.',
      'Registrant expressly acknowledges that: this Agreement is not a residential lease; this Agreement does not create a landlord-tenant relationship; Registrant is a temporary workshop participant only; and Registrant acquires no tenancy rights, leasehold interest, or continuing right of occupancy beyond the scheduled workshop dates.',
    ],
  },
  {
    title: '7. Basement Suite Amenities',
    paragraphs: [
      'If staying on-site, Registrant will receive access to a furnished basement suite that includes:',
      'Amenities are provided as a convenience and may be substituted or unavailable without prior notice.',
    ],
    bullets: [
      'One queen-size bed',
      'One twin bed',
      'Television(s)',
      'Private bathroom',
      'Shower',
      'Wireless internet (Wi-Fi)',
      'Towels',
      'Soap',
      'Shampoo',
      'Conditioner',
      'Private exterior exit door',
    ],
  },
  {
    title: '8. Parking',
    paragraphs: [
      'Registrant may park in Reserved Garage Parking Space #5 during the workshop.',
      'Registrant assumes all responsibility for: their vehicle; vehicle contents; and personal belongings left in the vehicle.',
      'Lifestacks LLC and Joseph Hendrickson are not responsible for theft, vandalism, weather damage, towing, accidents, or any other damage involving vehicles parked on or near the property.',
    ],
  },
  {
    title: '9. Room Access',
    paragraphs: [
      'Registrant will receive room key access during the workshop.',
      'Registrant agrees:',
    ],
    bullets: [
      'not to duplicate keys;',
      'not to provide keys or access to any unauthorized person;',
      'not to permit overnight guests without written approval;',
      'to immediately report lost keys;',
      'to return all keys upon checkout.',
      'Registrant is responsible for reasonable replacement costs associated with lost or damaged keys.',
    ],
  },
  {
    title: '10. Conduct',
    paragraphs: ['Registrant agrees to:'],
    bullets: [
      'respect the property;',
      'maintain cleanliness;',
      'comply with all reasonable house rules;',
      'respect neighbors;',
      'refrain from excessive noise;',
      'refrain from illegal activity;',
      'refrain from possessing illegal drugs;',
      'refrain from threatening, abusive, or violent conduct;',
      'refrain from damaging property.',
      'Violation of these rules may result in immediate termination of workshop participation without refund.',
    ],
  },
  {
    title: '11. Assumption of Risk',
    paragraphs: [
      'Registrant understands that participation in the workshop and presence at the property involve inherent risks.',
      'Examples include, but are not limited to: stairs; slips; trips; falls; wet floors; uneven surfaces; electrical devices; household furniture; lifting luggage; weather conditions; insects; fire; accidental injury; and any ordinary residential hazard.',
      'Registrant voluntarily assumes all risks associated with participation and occupancy.',
    ],
  },
  {
    title: '12. Release and Waiver of Liability',
    paragraphs: [
      'To the fullest extent permitted by Ohio law, Registrant voluntarily releases, waives, and forever discharges: Lifestacks LLC; Joseph Hendrickson; the property owner; officers; members; managers; employees; contractors; volunteers; representatives; successors; and assigns from any and all claims, demands, actions, causes of action, liabilities, damages, losses, costs, or expenses arising from or relating to participation in the workshop, occupancy of the property, coaching sessions, use of the premises, or use of any amenities, except where liability cannot legally be waived under applicable law.',
      'Registrant understands that this release is intended to be interpreted as broadly as permitted under Ohio law.',
    ],
  },
  {
    title: '13. Medical Responsibility',
    paragraphs: [
      'Registrant certifies that they are physically capable of participating.',
      'Registrant is solely responsible for obtaining any medical treatment they may require.',
      'Lifestacks LLC and Joseph Hendrickson have no obligation to provide medical care.',
      'Registrant assumes all responsibility for any medical costs incurred during or after participation.',
      'Emergency services may be contacted if deemed reasonably necessary.',
    ],
  },
  {
    title: '14. Personal Property',
    paragraphs: [
      'Registrant is solely responsible for safeguarding all personal belongings.',
      'Lifestacks LLC and Joseph Hendrickson are not responsible for lost, stolen, misplaced, or damaged property.',
    ],
  },
  {
    title: '15. Internet and Technology',
    paragraphs: [
      'Wi-Fi is provided solely as a convenience.',
      'Lifestacks LLC does not guarantee: uninterrupted service; availability; speed; compatibility; or security.',
      'Registrant assumes all risks associated with internet use.',
    ],
  },
  {
    title: '16. Checkout',
    paragraphs: [
      `Workshop participation concludes on ${WORKSHOP_CHECKOUT}.`,
      'Registrant agrees to completely vacate the property no later than that time unless a written extension has been approved by Lifestacks LLC.',
    ],
  },
  {
    title: '17. Overstay',
    paragraphs: [
      `Registrant acknowledges that permission to occupy the property automatically expires at 11:00 AM on August 7 unless expressly extended in writing by Lifestacks LLC.`,
      'Any continued occupancy after the scheduled checkout without written authorization constitutes unauthorized occupancy.',
      'Lifestacks LLC reserves all rights available under Ohio law, including requesting that the Registrant immediately vacate the premises, contacting law enforcement if appropriate, and pursuing recovery of documented damages, costs, and other remedies permitted by law.',
      'Registrant further agrees that they may be responsible, to the extent permitted by law, for: additional occupancy charges; reasonable holdover fees; cleaning costs; legal expenses where recoverable; property damage; and lost business opportunities resulting from the unauthorized occupancy.',
    ],
  },
  {
    title: '18. Indemnification',
    paragraphs: [
      'To the fullest extent permitted by law, Registrant agrees to defend, indemnify, and hold harmless: Lifestacks LLC; Joseph Hendrickson; the property owner; affiliates; contractors; employees; agents; and representatives from any claims, liabilities, damages, costs, judgments, settlements, or attorney’s fees arising from: Registrant’s conduct; negligence; violation of law; damage to property; breach of this Agreement; or injury caused by the Registrant or the Registrant’s guests.',
    ],
  },
  {
    title: '19. Entire Agreement',
    paragraphs: [
      'This Agreement constitutes the complete understanding between the parties.',
      'No oral statements or prior communications modify this Agreement.',
      'Any amendment must be in writing and approved by Lifestacks LLC.',
    ],
  },
  {
    title: '20. Governing Law',
    paragraphs: [
      'This Agreement shall be governed by and interpreted under the laws of the State of Ohio.',
      'Any legal proceeding relating to this Agreement shall be brought in a court of competent jurisdiction located in Franklin County, Ohio, unless otherwise required by applicable law.',
    ],
  },
  {
    title: '21. Registration Confirmation and Identity Verification',
    paragraphs: [
      'To complete registration for the Lifestacks Workshop, the Registrant must submit a valid government-issued photo identification.',
      'Acceptable forms of identification include: Driver’s License; State Identification Card; Passport; Military Identification; or other government-issued photo identification acceptable to Lifestacks LLC.',
      `The Registrant must email a clear, legible copy or photograph of their identification to: ${WORKSHOP_ID_EMAIL}`,
      'Registration is not considered complete until the required identification has been received and accepted by Lifestacks LLC.',
      'By submitting identification via email, the Registrant certifies that: the identification belongs to the Registrant; all registration information is truthful and accurate; the Registrant has read and agrees to all terms and conditions contained in this Agreement; and submission of the identification by email constitutes the Registrant’s electronic acceptance of this Agreement and shall have the same force and effect as a handwritten signature to the fullest extent permitted by applicable law.',
      'Lifestacks LLC reserves the right to decline or cancel any registration if: identity cannot be verified; false or misleading information is provided; the Registrant fails to comply with these Terms and Conditions; or participation is otherwise deemed inappropriate or unsafe.',
      'Identification submitted for verification will be used solely for registration verification, safety, security, recordkeeping, and legal compliance purposes, except as otherwise required by law.',
    ],
  },
  {
    title: '22. Acceptance of Terms',
    paragraphs: [
      `By registering for the Lifestacks Workshop, submitting payment (if applicable), participating in any coaching session, accessing the Lifestacks platform, checking into the workshop property, or submitting identification to ${WORKSHOP_ID_EMAIL}, the Registrant acknowledges that they have read, understood, and voluntarily agreed to be legally bound by every provision of this Agreement.`,
      'The Registrant further acknowledges that they have had the opportunity to ask questions regarding these Terms and Conditions prior to participating in the workshop and voluntarily choose to participate with full knowledge of the rights and obligations described herein.',
    ],
  },
]

export const WORKSHOP_TERMS_HEADER = {
  title: 'Lifestacks Workshop Registration Agreement',
  host: WORKSHOP_HOST,
  workshop: WORKSHOP_TITLE,
  facilitator: WORKSHOP_FACILITATOR,
  location: WORKSHOP_LOCATION,
  dates: WORKSHOP_DATES,
  checkIn: WORKSHOP_CHECK_IN,
  checkout: WORKSHOP_CHECKOUT,
}
