import OpenAI from 'openai'

export interface KnowledgeCard {
  id: string
  type: 'requirement' | 'constraint' | 'decision' | 'risk' | 'persona' | 'term' | 'policy'
  canonical_name: string
  value: string
  source_document: string
  source_chunk_id: string
  confidence_score: number
  version: number
  is_conflict: boolean
  conflict_with?: string
}

export interface SufficiencyReport {
  coverage_percentages: {
    requirements: number
    constraints: number
    decisions: number
    risks: number
    terms: number
    personas: number
  }
  missing_items: string[]
  conflicts: string[]
  warnings: Array<{
    type: 'critical' | 'recommended'
    message: string
    category: string
  }>
}

export interface ProjectPlan {
  title: string
  executive_summary: string
  scope: {
    primary_deliverables: string[]
    success_criteria: string[]
    out_of_scope: string[]
  }
  wbs: {
    phases: Array<{
      name: string
      description: string
      tasks: string[]
      duration_estimate: string
    }>
  }
  raid: {
    risks: Array<{
      description: string
      impact: 'low' | 'medium' | 'high'
      probability: 'low' | 'medium' | 'high'
      mitigation: string
    }>
    assumptions: string[]
    issues: string[]
    dependencies: string[]
  }
  communication_plan: {
    stakeholders: Array<{
      name: string
      role: string
      communication_frequency: string
      preferred_method: string
    }>
    reporting_schedule: string[]
  }
  governance: {
    project_sponsor: string
    project_manager: string
    technical_lead: string
    approval_process: string[]
  }
  timeline: {
    duration: string
    milestones: Array<{
      name: string
      date: string
      deliverables: string[]
    }>
  }
  budget: {
    estimated_cost: string
    cost_breakdown: string[]
    budget_risks: string[]
  }
}

export class AIService {
  private openai: OpenAI

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    })
  }

  async extractKnowledgeCards(text: string, documentName: string): Promise<KnowledgeCard[]> {
    try {
      const prompt = `
Extract structured knowledge cards from the following project document. Return a JSON array of knowledge cards with the following structure:

{
  "cards": [
    {
      "type": "requirement|constraint|decision|risk|persona|term|policy",
      "canonical_name": "A concise, standardized name for this item",
      "value": "The full description or value of this item",
      "confidence_score": 0.95
    }
  ]
}

Document: ${documentName}
Text: ${text}

Extract all relevant project information including:
- Requirements: What needs to be delivered
- Constraints: Limitations and boundaries
- Decisions: Made or pending decisions
- Risks: Potential problems or challenges
- Personas: Stakeholders, users, or roles mentioned
- Terms: Important terminology or definitions
- Policy: Rules, guidelines, or standards

Be thorough but precise. Each card should represent a distinct piece of project knowledge.
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      const cards = result.cards || []

      return cards.map((card: any, index: number) => ({
        id: `card_${Date.now()}_${index}`,
        type: card.type,
        canonical_name: card.canonical_name,
        value: card.value,
        source_document: documentName,
        source_chunk_id: `chunk_${Date.now()}_${index}`,
        confidence_score: card.confidence_score || 0.8,
        version: 1,
        is_conflict: false,
      }))
    } catch (error) {
      console.error('Error extracting knowledge cards:', error)
      throw new Error('Failed to extract knowledge cards')
    }
  }

  async generateSufficiencyReport(cards: KnowledgeCard[]): Promise<SufficiencyReport> {
    try {
      const cardTypes = ['requirements', 'constraints', 'decisions', 'risks', 'terms', 'personas']
      const cardsByType = cardTypes.reduce(
        (acc, type) => {
          acc[type] = cards.filter((card) => card.type === type.slice(0, -1)) // Remove 's' from end
          return acc
        },
        {} as Record<string, KnowledgeCard[]>
      )

      const prompt = `
Analyze the following knowledge cards extracted from project documents and generate a sufficiency report.

Knowledge Cards by Type:
${Object.entries(cardsByType)
  .map(
    ([type, cards]) =>
      `${type.toUpperCase()} (${cards.length} found):\n${cards.map((card) => `- ${card.canonical_name}: ${card.value}`).join('\n')}`
  )
  .join('\n\n')}

Generate a JSON response with:
{
  "coverage_percentages": {
    "requirements": 85,
    "constraints": 70,
    "decisions": 60,
    "risks": 45,
    "terms": 90,
    "personas": 75
  },
  "missing_items": ["List of critical missing information"],
  "conflicts": ["List of conflicting information found"],
  "warnings": [
    {
      "type": "critical|recommended",
      "message": "Description of the issue",
      "category": "budget|timeline|scope|risk|stakeholder"
    }
  ]
}

Rate coverage from 0-100 based on typical project needs. Critical warnings should block plan generation.
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      return JSON.parse(response.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error generating sufficiency report:', error)
      throw new Error('Failed to generate sufficiency report')
    }
  }

  async generateProjectPlan(
    cards: KnowledgeCard[],
    clientName: string,
    projectName: string
  ): Promise<ProjectPlan> {
    try {
      const prompt = `
Generate a comprehensive project plan based on the following knowledge cards extracted from client documents.

Client: ${clientName}
Project: ${projectName}

Knowledge Cards:
${cards.map((card) => `[${card.type.toUpperCase()}] ${card.canonical_name}: ${card.value}`).join('\n')}

Create a detailed project plan in JSON format with the following structure:
{
  "title": "Project Plan Title",
  "executive_summary": "Brief overview of the project",
  "scope": {
    "primary_deliverables": ["List of main deliverables"],
    "success_criteria": ["How success will be measured"],
    "out_of_scope": ["What is explicitly excluded"]
  },
  "wbs": {
    "phases": [
      {
        "name": "Phase name",
        "description": "Phase description",
        "tasks": ["List of tasks"],
        "duration_estimate": "Estimated duration"
      }
    ]
  },
  "raid": {
    "risks": [
      {
        "description": "Risk description",
        "impact": "low|medium|high",
        "probability": "low|medium|high",
        "mitigation": "Mitigation strategy"
      }
    ],
    "assumptions": ["Project assumptions"],
    "issues": ["Current issues"],
    "dependencies": ["External dependencies"]
  },
  "communication_plan": {
    "stakeholders": [
      {
        "name": "Stakeholder name",
        "role": "Their role",
        "communication_frequency": "How often",
        "preferred_method": "Email, meeting, etc."
      }
    ],
    "reporting_schedule": ["Reporting milestones"]
  },
  "governance": {
    "project_sponsor": "Sponsor name/role",
    "project_manager": "PM name/role",
    "technical_lead": "Tech lead name/role",
    "approval_process": ["Approval steps"]
  },
  "timeline": {
    "duration": "Total project duration",
    "milestones": [
      {
        "name": "Milestone name",
        "date": "Target date",
        "deliverables": ["What's delivered"]
      }
    ]
  },
  "budget": {
    "estimated_cost": "Cost estimate",
    "cost_breakdown": ["Cost categories"],
    "budget_risks": ["Budget-related risks"]
  }
}

Make the plan specific to the client's needs based on the extracted information. Include citations to source documents where possible.
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      return JSON.parse(response.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error generating project plan:', error)
      throw new Error('Failed to generate project plan')
    }
  }

  async generatePlanMarkdown(plan: ProjectPlan): Promise<string> {
    const markdown = `# ${plan.title}

## Executive Summary
${plan.executive_summary}

## Project Scope
### Primary Deliverables
${plan.scope.primary_deliverables.map((item) => `- ${item}`).join('\n')}

### Success Criteria
${plan.scope.success_criteria.map((item) => `- ${item}`).join('\n')}

### Out of Scope
${plan.scope.out_of_scope.map((item) => `- ${item}`).join('\n')}

## Work Breakdown Structure (WBS)
${plan.wbs.phases
  .map(
    (phase) => `
### ${phase.name}
**Duration:** ${phase.duration_estimate}
**Description:** ${phase.description}

**Tasks:**
${phase.tasks.map((task) => `- ${task}`).join('\n')}
`
  )
  .join('\n')}

## Risk Assessment & Mitigation (RAID)
### Risks
${plan.raid.risks
  .map(
    (risk) => `
- **${risk.description}**
  - Impact: ${risk.impact} | Probability: ${risk.probability}
  - Mitigation: ${risk.mitigation}
`
  )
  .join('\n')}

### Assumptions
${plan.raid.assumptions.map((item) => `- ${item}`).join('\n')}

### Issues
${plan.raid.issues.map((item) => `- ${item}`).join('\n')}

### Dependencies
${plan.raid.dependencies.map((item) => `- ${item}`).join('\n')}

## Communication Plan
### Stakeholders
${plan.communication_plan.stakeholders
  .map(
    (stakeholder) => `
- **${stakeholder.name}** (${stakeholder.role})
  - Frequency: ${stakeholder.communication_frequency}
  - Method: ${stakeholder.preferred_method}
`
  )
  .join('\n')}

### Reporting Schedule
${plan.communication_plan.reporting_schedule.map((item) => `- ${item}`).join('\n')}

## Governance Structure
- **Project Sponsor:** ${plan.governance.project_sponsor}
- **Project Manager:** ${plan.governance.project_manager}
- **Technical Lead:** ${plan.governance.technical_lead}

### Approval Process
${plan.governance.approval_process.map((step) => `- ${step}`).join('\n')}

## Timeline & Milestones
**Total Duration:** ${plan.timeline.duration}

${plan.timeline.milestones
  .map(
    (milestone) => `
### ${milestone.name}
**Date:** ${milestone.date}
**Deliverables:**
${milestone.deliverables.map((item) => `- ${item}`).join('\n')}
`
  )
  .join('\n')}

## Budget Considerations
**Estimated Cost:** ${plan.budget.estimated_cost}

### Cost Breakdown
${plan.budget.cost_breakdown.map((item) => `- ${item}`).join('\n')}

### Budget Risks
${plan.budget.budget_risks.map((item) => `- ${item}`).join('\n')}

---
*This project plan was generated using AI analysis of client documents on ${new Date().toLocaleDateString()}.*`

    return markdown
  }
}
