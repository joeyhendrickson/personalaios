#!/usr/bin/env node
/**
 * Generates public/lifestacks-master-import-template.xlsx
 * Run: npm run generate:import-template
 */
import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/lifestacks-master-import-template.xlsx')

const categories = [
  ['category_slug', 'display_name', 'description', 'example_use'],
  ['health', 'Health', 'Physical and mental wellness', 'Workouts, sleep, nutrition projects'],
  ['productivity', 'Productivity', 'Focus and output', 'Deep work blocks, inbox zero'],
  ['learning', 'Learning', 'Skills and education', 'Courses, reading, certifications'],
  ['financial', 'Financial', 'Money goals', 'Savings, debt payoff, income'],
  ['personal', 'Personal', 'Life and relationships', 'Family time, hobbies'],
  ['business_growth', 'Business Growth', 'Career and business', 'Sales, marketing, launches'],
  ['save_money', 'Save Money', 'Reduce spending', 'Budget cuts, subscriptions'],
  ['other', 'Other', 'Fallback category', 'Use when nothing else fits'],
]

const lifeGoals = [
  [
    'title',
    'description',
    'goal_type',
    'target_value',
    'target_unit',
    'priority_level',
    'target_date',
    'status',
  ],
  [
    'Run a half marathon',
    'Build endurance and complete a race in under 2 hours',
    'yearly',
    '1',
    'race',
    '4',
    '2026-11-01',
    'active',
  ],
  [
    'Grow consulting revenue',
    'Increase recurring consulting income',
    'yearly',
    '150000',
    'USD',
    '5',
    '2026-12-31',
    'active',
  ],
]

const projects = [
  [
    'title',
    'description',
    'category',
    'target_points',
    'target_money',
    'linked_goal_title',
    'deadline',
  ],
  [
    'Half marathon training block',
    '12-week training plan with weekly mileage targets',
    'health',
    '500',
    '0',
    'Run a half marathon',
    '2026-10-15',
  ],
  [
    'Q2 client pipeline',
    'Prospecting, proposals, and follow-ups for new clients',
    'business_growth',
    '400',
    '25000',
    'Grow consulting revenue',
    '2026-06-30',
  ],
]

const tasks = [
  [
    'title',
    'description',
    'project_title',
    'points_value',
    'money_value',
    'priority',
    'estimated_time',
  ],
  [
    'Long run 10 miles',
    'Sunday long run at easy pace',
    'Half marathon training block',
    '40',
    '0',
    'high',
    '90 minutes',
  ],
  [
    'Send 5 outreach emails',
    'Personalized emails to warm leads',
    'Q2 client pipeline',
    '30',
    '0',
    'high',
    '45 minutes',
  ],
]

const habits = [
  ['title', 'description', 'points_per_completion', 'is_active'],
  ['Morning walk', '20-minute walk before work', '20', 'true'],
  ['Plan tomorrow', 'Review calendar and top 3 priorities', '15', 'true'],
]

const education = [
  [
    'title',
    'description',
    'points_value',
    'cost',
    'priority_level',
    'status',
    'target_date',
  ],
  [
    'AWS Solutions Architect',
    'Complete certification prep and exam',
    '200',
    '150',
    '4',
    'in_progress',
    '2026-08-01',
  ],
]

const instructions = [
  ['LifeStacks Master Import Template'],
  [''],
  ['HOW TO USE WITH CHATGPT'],
  ['1. Download chatgpt-lifestacks-import-prompt.md from LifeStacks Import page'],
  ['2. Upload this Excel file to ChatGPT'],
  ['3. Add your context: notes, PDFs, job description, goals doc, etc.'],
  ['4. Ask ChatGPT to fill every sheet using the prompt rules'],
  ['5. Download the completed Excel file and import it at LifeStacks → Import'],
  [''],
  ['SHEETS'],
  ['Categories — valid category slugs (reference)'],
  ['LifeGoals — high-level goals (NO points)'],
  ['Projects — weekly dashboard projects WITH target_points'],
  ['Tasks — project_title links to Projects; points_value on completion'],
  ['Habits — points_per_completion each time done'],
  ['Education — points_value on completion'],
]

function sheetFromRows(rows) {
  return XLSX.utils.aoa_to_sheet(rows)
}

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, sheetFromRows(instructions), 'Instructions')
XLSX.utils.book_append_sheet(wb, sheetFromRows(categories), 'Categories')
XLSX.utils.book_append_sheet(wb, sheetFromRows(lifeGoals), 'LifeGoals')
XLSX.utils.book_append_sheet(wb, sheetFromRows(projects), 'Projects')
XLSX.utils.book_append_sheet(wb, sheetFromRows(tasks), 'Tasks')
XLSX.utils.book_append_sheet(wb, sheetFromRows(habits), 'Habits')
XLSX.utils.book_append_sheet(wb, sheetFromRows(education), 'Education')

writeFileSync(outPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log('Wrote', outPath)
