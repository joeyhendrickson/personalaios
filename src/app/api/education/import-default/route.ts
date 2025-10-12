import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/education/import-default - Import default education items for the current user
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Importing default education items for user:', user.id)

    // Check if user already has education items
    const { data: existingItems, error: checkError } = await supabase
      .from('education_items')
      .select('id')
      .eq('user_id', user.id)

    if (checkError) {
      console.error('Error checking existing education items:', checkError)
      return NextResponse.json(
        {
          error: 'Failed to check existing education items',
          details: checkError.message,
          code: checkError.code,
        },
        { status: 500 }
      )
    }

    if (existingItems && existingItems.length > 0) {
      return NextResponse.json(
        {
          message: 'User already has education items. Skipping import.',
          existing_count: existingItems.length,
        },
        { status: 200 }
      )
    }

    // Default education items to import
    const defaultEducationItems = [
      {
        title: 'Microsoft Dynamics 365',
        description: 'Microsoft Dynamics 365 certification',
        points_value: 1000,
        priority_level: 3,
      },
      {
        title: 'Take Yellow Belt Practice Test',
        description: 'Complete Yellow Belt practice test',
        points_value: 100,
        priority_level: 4,
      },
      {
        title: 'Microsoft Generative AI Certification',
        description: 'Microsoft Generative AI certification',
        points_value: 200,
        priority_level: 3,
      },
      {
        title: 'AWS Certified Cloud Practitioner',
        description: 'AWS Certified Cloud Practitioner certification',
        points_value: 1000,
        cost: 100,
        priority_level: 3,
      },
      {
        title: 'Microsoft Certified: Azure Administrator Associate (AZ-104)',
        description: 'Microsoft Azure Administrator Associate certification',
        points_value: 1000,
        cost: 165,
        priority_level: 3,
      },
      {
        title: 'AWS Certified AI Practitioner',
        description: 'AWS Certified AI Practitioner certification',
        points_value: 1000,
        cost: 100,
        priority_level: 3,
      },
      {
        title: 'Make a presentation for my work, job applications',
        description: 'Create presentation for work and job applications',
        points_value: 200,
        priority_level: 4,
      },
      {
        title: 'Complete All A-CSM Assignments by January 31',
        description: 'Complete all A-CSM assignments by January 31',
        points_value: 300,
        priority_level: 2,
        target_date: '2025-01-31',
      },
      {
        title: 'Attend A-CSM Scrum Alliance Meeting APRIL 3',
        description: 'Attend A-CSM Scrum Alliance meeting on April 3',
        points_value: 75,
        priority_level: 3,
        target_date: '2025-04-03',
      },
      {
        title: 'A-CSM Completion by April 18',
        description: 'Complete A-CSM certification by April 18',
        points_value: 200,
        priority_level: 2,
        target_date: '2025-04-18',
      },
      {
        title: 'Get the teaching English (TEFL) certification',
        description: 'Obtain TEFL (Teaching English as a Foreign Language) certification',
        points_value: 200,
        priority_level: 4,
      },
      {
        title: 'Yellow Belt Exam',
        description: 'Complete Yellow Belt exam',
        points_value: 800,
        priority_level: 3,
      },
      {
        title: 'Kanban Management Professional or Kanban Coaching Professional',
        description:
          'Obtain Kanban Management Professional or Kanban Coaching Professional certification',
        points_value: 500,
        priority_level: 4,
      },
      {
        title: 'SPC Course and Exam',
        description: 'Complete SPC (Scaled Professional Scrum) course and exam',
        points_value: 1000,
        priority_level: 3,
      },
      {
        title: 'AWS Certified Solutions Architect – Associate',
        description: 'AWS Certified Solutions Architect Associate certification',
        points_value: 500,
        cost: 150,
        priority_level: 3,
      },
      {
        title: 'AWS Certified Machine Learning – Specialty',
        description: 'AWS Certified Machine Learning Specialty certification',
        points_value: 500,
        cost: 300,
        priority_level: 3,
      },
      {
        title: 'Microsoft Certified: Azure AI Fundamentals (AI-900)',
        description: 'Microsoft Azure AI Fundamentals certification',
        points_value: 500,
        cost: 100,
        priority_level: 3,
      },
      {
        title: 'Microsoft Certified: Azure Data Fundamentals (DP-900)',
        description: 'Microsoft Azure Data Fundamentals certification',
        points_value: 500,
        cost: 100,
        priority_level: 3,
      },
      {
        title: 'Salesforce AI Associate',
        description: 'Salesforce AI Associate certification',
        points_value: 500,
        priority_level: 3,
      },
      {
        title: 'CCMP or Prossi Change Management',
        description: 'CCMP or Prossi Change Management certification',
        points_value: 300,
        priority_level: 4,
      },
    ]

    // Insert all default education items
    const itemsToInsert = defaultEducationItems.map((item) => ({
      user_id: user.id,
      ...item,
      is_active: true,
      status: 'pending',
    }))

    const { data: insertedItems, error: insertError } = await supabase
      .from('education_items')
      .insert(itemsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting default education items:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to insert default education items',
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 }
      )
    }

    console.log(`Successfully imported ${insertedItems?.length || 0} default education items`)

    return NextResponse.json(
      {
        message: `Successfully imported ${insertedItems?.length || 0} default education items`,
        educationItems: insertedItems,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error importing default education items:', error)
    return NextResponse.json(
      {
        error: 'Failed to import default education items',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
