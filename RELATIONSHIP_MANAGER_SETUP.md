# Relationship Manager Setup Guide

## Overview

The Relationship Manager is a sophisticated AI-powered system for managing and strengthening personal and professional relationships. It adapts to different relationship types and provides contextual suggestions for maintaining connections.

## Features

### Relationship Types

- **Family (Close Cultural)** - Health tracking, prayer lists, cultural events
- **Potential Investors (Fundraising)** - Business opportunities, networking events
- **Potential Clients (Sales)** - Business needs, engagement strategies
- **Friendships (Social)** - Shared interests, social activities
- **Dating (Romantic)** - Date history, witty messaging, restaurant suggestions

### Core Functionality

- **Contact Management** - Add, edit, and organize contacts by relationship type
- **Interaction Tracking** - Log calls, texts, emails, meetings, dates, events
- **AI-Powered Suggestions** - Personalized recommendations based on relationship type
- **Engagement Scoring** - Track relationship health and engagement levels
- **Smart Reminders** - Frequency-based contact suggestions
- **Location-Based Activities** - Restaurant and event suggestions near zipcodes

## Database Setup

### Step 1: Apply the Migration

Run the following SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/migrations/021_create_relationship_manager.sql
```

### Step 2: Verify Tables Created

Check that these tables were created:

- `relationship_types`
- `contacts`
- `contact_profiles`
- `interactions`
- `ai_suggestions`
- `relationship_goals`

## API Endpoints

The following API endpoints are available:

- `GET /api/relationships/types` - Fetch relationship types
- `GET /api/relationships/contacts` - Fetch contacts (with optional filtering)
- `POST /api/relationships/contacts` - Create new contact
- `PUT /api/relationships/contacts/[id]` - Update contact
- `DELETE /api/relationships/contacts/[id]` - Delete contact
- `GET /api/relationships/interactions` - Fetch interactions
- `POST /api/relationships/interactions` - Log new interaction
- `GET /api/relationships/ai-suggestions` - Fetch AI suggestions
- `POST /api/relationships/ai-suggestions` - Generate new AI suggestions

## Usage Guide

### 1. Adding Contacts

1. Click "Add Contact" button
2. Fill in basic information (name, relationship type, contact details)
3. Set preferred contact frequency
4. Add notes about the person

### 2. Logging Interactions

1. Select a contact from the Contacts tab
2. Go to Interactions tab
3. Click "Log Interaction"
4. Choose interaction type (call, text, email, meeting, date, event)
5. Add notes and outcomes
6. Set follow-up date if needed

### 3. Getting AI Suggestions

1. Select a contact
2. Go to AI Suggestions tab
3. Enter your zipcode for location-based suggestions
4. Click "Generate Suggestions"
5. Review and act on personalized recommendations

### 4. Relationship Type Contexts

#### Family (Close Cultural)

- Tracks health updates, prayer requests, cultural events
- Suggests empathetic communication and family activities
- Reminds about birthdays, anniversaries, and important dates

#### Potential Investors (Fundraising)

- Focuses on business opportunities and project alignment
- Suggests networking events, business dinners, sports events
- Provides pitch message generation and introduction recommendations

#### Potential Clients (Sales)

- Tracks business needs and engagement strategies
- Suggests follow-up timing and event invitations
- Provides business-focused conversation starters

#### Friendships (Social)

- Tracks shared interests and social activities
- Suggests social meetups and personal milestones
- Provides casual conversation starters

#### Dating (Romantic)

- Maintains detailed date history and personal notes
- Generates witty/classy messages and romantic suggestions
- Suggests restaurants and activities based on interests
- Provides "wingman" functionality for relationship building

## AI Integration

The AI system analyzes:

- Relationship type and context
- Contact profile data and preferences
- Recent interaction history
- Engagement scores and contact frequency
- User's daily priorities and location

It generates contextual suggestions including:

- **Messages** - Personalized communication content
- **Activities** - Suggested activities and events
- **Follow-ups** - Timing and method recommendations
- **Events** - Location-based event suggestions

## Dashboard Integration

The Relationship Manager integrates with the main dashboard to:

- Show relationship-related priorities
- Suggest contacts to reach out to based on daily goals
- Provide quick access to relationship management tasks
- Display relationship health metrics

## Security & Privacy

- All data is user-specific with Row Level Security (RLS)
- Contact information is encrypted and secure
- AI suggestions are generated locally and not stored externally
- Users have full control over their relationship data

## Troubleshooting

### Common Issues

1. **"Failed to load data" error**
   - Ensure the database migration was applied successfully
   - Check that RLS policies are enabled

2. **AI suggestions not generating**
   - Verify OpenAI API key is configured
   - Check that contact has sufficient profile data

3. **Contacts not saving**
   - Ensure all required fields are filled
   - Check database connection and permissions

### Support

For technical issues, check:

1. Browser console for JavaScript errors
2. Network tab for API call failures
3. Supabase logs for database errors

## Future Enhancements

Planned features include:

- Calendar integration for automatic event scheduling
- Email integration for automated follow-ups
- Social media integration for relationship insights
- Advanced analytics and relationship health trends
- Team collaboration features for business relationships
