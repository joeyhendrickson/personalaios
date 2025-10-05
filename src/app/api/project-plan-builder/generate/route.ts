import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Get the analysis job
    const { data: job, error: jobError } = await supabase
      .from('project_plan_builder_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Analysis job not found' }, { status: 404 })
    }

    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Analysis job must be completed first' }, { status: 400 })
    }

    // Check for critical warnings that should block plan generation
    const criticalWarnings =
      job.sufficiency_report?.warnings?.filter((warning: any) => warning.type === 'critical') || []

    if (criticalWarnings.length > 0) {
      return NextResponse.json(
        {
          error: 'Critical warnings must be addressed before generating plan',
          warnings: criticalWarnings,
        },
        { status: 400 }
      )
    }

    // Create a new plan
    const planId = uuidv4()
    const planTitle = `${job.client_name} - ${job.project_name} Project Plan`

    const { error: planError } = await supabase.from('project_plan_builder_plans').insert({
      id: planId,
      user_id: user.id,
      job_id: job_id,
      title: planTitle,
      status: 'draft',
      content: null, // Will be generated
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (planError) {
      console.error('Error creating plan:', planError)
      return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
    }

    // Start background plan generation process
    setTimeout(async () => {
      try {
        // Simulate plan generation with RAG retrieval and AI processing
        const mockPlanContent = `# ${planTitle}

## Executive Summary
This project plan has been generated based on analysis of client documents and requirements. The following sections outline the scope, deliverables, timeline, and risk management approach.

## Project Scope
Based on the analysis of client documents, the project includes:
- **Primary Deliverables**: [Generated from requirements analysis]
- **Success Criteria**: [Generated from client goals]
- **Out of Scope**: [Generated from constraints analysis]

## Work Breakdown Structure (WBS)
### Phase 1: Planning & Setup
- Project kickoff and stakeholder alignment
- Requirements finalization
- Resource allocation

### Phase 2: Development
- Core development activities
- Testing and quality assurance
- Client feedback integration

### Phase 3: Deployment & Handover
- Production deployment
- Training and documentation
- Project closure

## Risk Assessment & Mitigation (RAID)
### Risks Identified:
${
  job.sufficiency_report?.warnings
    ?.map((warning: any) => `- **${warning.category.toUpperCase()}**: ${warning.message}`)
    .join('\n') || '- No specific risks identified in analysis'
}

### Risk Mitigation Strategies:
- Regular stakeholder communication
- Contingency planning for identified risks
- Progress monitoring and early warning systems

## Communication Plan
- **Client Updates**: Weekly status reports
- **Stakeholder Meetings**: Bi-weekly progress reviews
- **Escalation Process**: [Defined based on client requirements]

## Governance Structure
- **Project Sponsor**: [To be confirmed with client]
- **Project Manager**: [Assigned based on availability]
- **Technical Lead**: [Assigned based on project requirements]

## Timeline & Milestones
- **Project Duration**: [Estimated based on scope analysis]
- **Key Milestones**: [Generated from requirements and constraints]

## Budget Considerations
${
  job.sufficiency_report?.missing_items?.includes('Budget ceiling not specified')
    ? '- **Note**: Budget ceiling not specified in provided documents. Budget planning required.'
    : '- Budget requirements identified from client documents'
}

## Next Steps
1. Client approval of project plan
2. Resource allocation and team assignment
3. Detailed task breakdown and timeline refinement
4. Kickoff meeting scheduling

---
*This plan was generated on ${new Date().toLocaleDateString()} based on analysis of client documents including meeting notes, requirements, and project specifications.*`

        // Update plan with generated content
        await supabase
          .from('project_plan_builder_plans')
          .update({
            content: mockPlanContent,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', planId)
      } catch (error) {
        console.error('Error generating plan:', error)
        await supabase
          .from('project_plan_builder_plans')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', planId)
      }
    }, 3000) // 3 second delay to simulate processing

    return NextResponse.json({
      message: 'Plan generation started successfully',
      plan_id: planId,
    })
  } catch (error) {
    console.error('Error starting plan generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
