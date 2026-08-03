import 'server-only'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { ProgressReportDocument, ReportSwot } from './types'
import { getPdfLabels } from '@/lib/i18n/pdf-labels'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const LINE_HEIGHT = 14

function wrapText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function swotLines(
  swot: ReportSwot | undefined,
  labels: ReturnType<typeof getPdfLabels>
): string[] {
  if (!swot) return []
  const lines: string[] = []
  if (swot.strengths.length) {
    lines.push(labels.strengths)
    swot.strengths.forEach((s) => lines.push(`  • ${s}`))
    lines.push('')
  }
  if (swot.weaknesses.length) {
    lines.push(labels.weaknesses)
    swot.weaknesses.forEach((s) => lines.push(`  • ${s}`))
    lines.push('')
  }
  if (swot.opportunities.length) {
    lines.push(labels.opportunities)
    swot.opportunities.forEach((s) => lines.push(`  • ${s}`))
    lines.push('')
  }
  if (swot.threats.length) {
    lines.push(labels.threats)
    swot.threats.forEach((s) => lines.push(`  • ${s}`))
  }
  return lines
}

export async function buildProgressReportPdf(
  report: ProgressReportDocument,
  coverImageBase64: string | null
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const labels = getPdfLabels(report.language)
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const contentWidth = PAGE_WIDTH - MARGIN * 2

  const userProfile = report.userProfile
  const focusReview = report.focusReview
  const swot = report.swot

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  if (coverImageBase64) {
    try {
      const imageBytes = new Uint8Array(Buffer.from(coverImageBase64, 'base64'))
      const image = await pdf.embedPng(imageBytes)
      const imgW = contentWidth
      const scale = imgW / image.width
      const imgH = image.height * scale
      cover.drawImage(image, {
        x: MARGIN,
        y: y - imgH,
        width: imgW,
        height: imgH,
      })
      y -= imgH + 24
    } catch (e) {
      console.warn('[progress-reports] cover embed failed', e)
    }
  }

  cover.drawText(labels.brand, {
    x: MARGIN,
    y,
    size: 11,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.45),
  })
  y -= 22

  cover.drawText(labels.progressPlan, {
    x: MARGIN,
    y,
    size: 28,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.15),
  })
  y -= 32

  cover.drawText(report.periodLabel, {
    x: MARGIN,
    y,
    size: 14,
    font: fontRegular,
    color: rgb(0.25, 0.35, 0.55),
  })
  y -= 20

  cover.drawText(`${report.periodStart} — ${report.periodEnd}`, {
    x: MARGIN,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.45, 0.45, 0.5),
  })

  const addSectionPage = (sectionTitle: string, bodyLines: string[]) => {
    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let cursorY = PAGE_HEIGHT - MARGIN

    page.drawText(sectionTitle, {
      x: MARGIN,
      y: cursorY,
      size: 16,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.35),
    })
    cursorY -= 28

    for (const line of bodyLines) {
      const wrapped = wrapText(line, contentWidth, fontRegular, 11)
      for (const wl of wrapped) {
        if (cursorY < MARGIN + LINE_HEIGHT) {
          page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
          cursorY = PAGE_HEIGHT - MARGIN
        }
        page.drawText(wl, {
          x: MARGIN,
          y: cursorY,
          size: 11,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.25),
        })
        cursorY -= LINE_HEIGHT
      }
      cursorY -= 4
    }
  }

  const statsLines = [
    `${labels.totalPoints}: ${report.stats.totalPoints}`,
    `${labels.tasksCompletedStat}: ${report.stats.tasksCompleted}`,
    `${labels.tasksCreated}: ${report.stats.tasksCreated}`,
    `${labels.projectsCompleted}: ${report.stats.projectsCompleted}`,
    `${labels.habitCompletions}: ${report.stats.habitCompletions}`,
    ...(report.stats.topCategories.length
      ? [
          `${labels.topCategories}: ` +
            report.stats.topCategories.map((c) => `${c.category} (${c.points})`).join(', '),
        ]
      : []),
    ...(report.stats.goalsProgress.length
      ? report.stats.goalsProgress.map(
          (g) => `${labels.goalProgress} "${g.title}": ${g.progressPercent}%`
        )
      : []),
  ]

  addSectionPage(labels.atAGlance, statsLines)

  if (userProfile) {
    const profileLines = [
      labels.whoYouSeemToBe,
      ...wrapText(userProfile.whoYouSeemToBe, contentWidth, fontRegular, 11),
      '',
      labels.apparentFocus,
      ...wrapText(userProfile.apparentFocus, contentWidth, fontRegular, 11),
      '',
      labels.motivationDrivers,
      ...userProfile.motivationDrivers.map((d) => `• ${d}`),
    ]
    addSectionPage(labels.aboutYou, profileLines)
  }

  if (focusReview) {
    const focusLines = [
      ...wrapText(focusReview.summary, contentWidth, fontRegular, 11),
      '',
      ...(focusReview.tasksFocus.length
        ? [labels.tasksCompleted, ...focusReview.tasksFocus.map((t) => `• ${t}`), '']
        : []),
      ...(focusReview.projectsFocus.length
        ? [labels.projects, ...focusReview.projectsFocus.map((t) => `• ${t}`), '']
        : []),
      ...(focusReview.goalsFocus.length
        ? [labels.goals, ...focusReview.goalsFocus.map((t) => `• ${t}`)]
        : []),
    ]
    addSectionPage(labels.whereAttentionWent, focusLines)
  }

  const swotSection = swotLines(swot, labels)
  if (swotSection.length) {
    addSectionPage(labels.swotAnalysis, swotSection)
  }

  addSectionPage(
    labels.executiveSummary,
    wrapText(report.narrativeSummary, contentWidth, fontRegular, 11)
  )

  if (report.highlightsBullets.length) {
    addSectionPage(
      labels.highlights,
      report.highlightsBullets.map((b) => `• ${b}`)
    )
  }

  if (report.moduleHighlights.length) {
    const moduleLines: string[] = []
    for (const mod of report.moduleHighlights) {
      moduleLines.push(`${mod.moduleLabel} (${mod.usageCount} ${labels.interactions})`)
      for (const c of mod.conclusions) {
        moduleLines.push(`  — ${c}`)
      }
      moduleLines.push('')
    }
    addSectionPage(labels.moduleHighlights, moduleLines)
  }

  if (report.accomplishments.length) {
    addSectionPage(
      labels.accomplishments,
      report.accomplishments.map((a) => `• ${a}`)
    )
  }

  const footer = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  footer.drawText(labels.generatedBy, {
    x: MARGIN,
    y: PAGE_HEIGHT / 2,
    size: 10,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.55),
  })
  footer.drawText(new Date(report.generatedAt).toLocaleString(), {
    x: MARGIN,
    y: PAGE_HEIGHT / 2 - 16,
    size: 9,
    font: fontRegular,
    color: rgb(0.55, 0.55, 0.6),
  })

  return pdf.save()
}
