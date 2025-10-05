# RAID Monitoring Tool - Setup Guide

## Overview

The RAID Monitoring Tool is a powerful companion app that continuously analyzes Google Drive documents (meeting notes, Otter.ai transcripts, project docs) to build comprehensive RAID logs and automatically detect critical fires requiring immediate attention.

## Features

### Core Capabilities

- **Automated RAID Extraction**: AI-powered extraction of Risks, Assumptions, Issues, and Dependencies from documents
- **Real-Time Fire Detection**: Automatic detection of critical items requiring immediate attention
- **Centralized RAID Board**: Filterable, editable table view of all RAID entries
- **Continuous Sync**: Re-analysis when new documents appear in Google Drive
- **Export & Integration**: CSV export and integration with Project Plan Builder

### Fire Detection Rules

- **Risks**: High impact (≥4) × likelihood (≥4) or priority score ≥60
- **Issues**: Blockers or overdue items (>24h)
- **Dependencies**: Missing owner/date & blocking milestones
- **Assumptions**: Validation expired & not validated

### Security Features

- **Multi-Tenant BYOK**: Each user provides their own credentials
- **AES-GCM Encryption**: All user credentials encrypted at rest
- **Row Level Security**: Database-level access control
- **Audit Trail**: Immutable history of versions and changes

## Setup Instructions

### 1. Database Setup

Apply the database migration to create all necessary tables:

```sql
-- Run this in your Supabase SQL editor
-- File: create-raid-monitoring-tables.sql
```

This creates:

- `raid_monitoring_jobs` - Analysis job tracking
- `raid_monitoring_entries` - Individual RAID items with scoring
- `raid_monitoring_fires` - Fire events requiring attention

### 2. Environment Variables

Uses the same environment variables as Project Plan Builder:

```env
# Google OAuth (required for Drive integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/project-plan-builder/auth/google/callback

# Encryption key for user credentials
ENCRYPTION_KEY=your_secure_encryption_key_here

# OpenAI API key (optional - users can provide their own)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Dependencies

Uses the same dependencies as Project Plan Builder:

```bash
npm install @pinecone-database/pinecone googleapis openai uuid
npm install --save-dev @types/uuid
```

## User Workflow

### Step 1: Connect Services

1. Navigate to Business Hacks → RAID Monitoring Tool
2. Uses the same credentials as Project Plan Builder
3. Connect Google Drive, Pinecone, and optionally OpenAI

### Step 2: Run RAID Analysis

1. Provide Google Drive folder URL
2. Enter client name and project name
3. Click "Analyze RAID"
4. Monitor progress bar and results

### Step 3: Review RAID Board

1. View all extracted RAID entries in filterable table
2. Filter by type, severity, owner, status
3. Edit entries inline or view detailed information
4. Sort by priority score (highest first)

### Step 4: Manage Fires

1. Review active fires in dedicated tab
2. See trigger rules and recommended actions
3. Acknowledge, mitigate, or resolve fires
4. Track fire lifecycle and status changes

### Step 5: Export and Integrate

1. Export full RAID log as CSV
2. Enable integration with Project Plan Builder
3. Include RAID summaries in generated project plans

## Technical Architecture

### Frontend Components

- **Analyze Tab**: Folder selection and job monitoring
- **RAID Board**: Filterable table with inline editing
- **Fires Tab**: Critical items requiring attention
- **Export Tab**: Download and integration options
- **Settings Tab**: Connection status (shared with Project Plan Builder)

### API Routes

- `/api/raid-monitoring/analyze` - Start document analysis
- `/api/raid-monitoring/jobs` - Monitor analysis jobs
- `/api/raid-monitoring/entries` - Manage RAID entries
- `/api/raid-monitoring/fires` - Handle fire events
- `/api/raid-monitoring/export` - Export RAID data

### Data Model

#### RAID Entry

```typescript
{
  id: "raid:user:client:project:type:slug:vN",
  type: "Risk" | "Assumption" | "Issue" | "Dependency",
  title: "Missing vendor approval",
  description: "Vendor sign-off blocking production deployment",
  impact: 5, likelihood: 4, urgency: 3,
  confidence: 0.9,
  priority_score: 54, // Calculated: impact × likelihood × urgency × confidence × 100
  severity: "High", // Auto-calculated from priority score
  blocker: true,
  owner: "Ana",
  due_date: "2025-10-10",
  status: "Open",
  is_fire: true,
  fire_reason: "Blocker + overdue",
  fire_status: "Unacknowledged",
  sources: [{ doc_title: "Sprint 5 Retro", doc_date: "2025-10-03", excerpt: "..." }],
  version: 3
}
```

#### Fire Event

```typescript
{
  id: "fire:client:project:raidId:timestamp",
  raid_id: "raid:...",
  triggered_at: "ISO",
  trigger_rule: "Blocker + Overdue",
  priority_score: 75,
  severity: "Critical",
  next_actions: [
    "Escalate to PMO",
    "Assign mitigation owner",
    "Update client risk log"
  ],
  status: "Unacknowledged"
}
```

### Scoring System

#### Priority Score Calculation

```
Priority Score = Impact × Likelihood × Urgency × Confidence × 100
```

#### Severity Levels

- **Critical**: 76-100 points
- **High**: 51-75 points
- **Medium**: 26-50 points
- **Low**: 1-25 points

#### Fire Detection Triggers

| Type       | Trigger Condition                       | Severity      |
| ---------- | --------------------------------------- | ------------- |
| Risk       | Impact ≥4 & Likelihood ≥4 OR Score ≥60  | Critical      |
| Issue      | Blocker = true OR Overdue >24h          | High-Critical |
| Dependency | Missing owner/date & blocking milestone | High          |
| Assumption | Validation expired & not validated      | Medium-High   |

## Integration with Project Plan Builder

### Shared Credentials

- Uses the same Google Drive, Pinecone, and OpenAI credentials
- No additional setup required if Project Plan Builder is configured

### RAID Summary Integration

- RAID summaries automatically included in generated project plans
- Shows counts by type and severity
- Lists active fires requiring attention
- Provides risk assessment for project planning

## Advanced Features

### Automatic Severity Calculation

Database triggers automatically calculate severity based on priority score:

```sql
CREATE TRIGGER trigger_update_raid_entry_metadata
    BEFORE INSERT OR UPDATE ON raid_monitoring_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_raid_entry_metadata();
```

### Fire Detection Logic

Intelligent fire detection based on multiple criteria:

```sql
CREATE OR REPLACE FUNCTION detect_raid_fire(...)
RETURNS BOOLEAN AS $$
-- Complex logic for different RAID types
$$ LANGUAGE plpgsql;
```

### Version Tracking

- Automatic version incrementing on updates
- Immutable history of changes
- Source document tracking with excerpts

## Troubleshooting

### Common Issues

**Analysis Job Failures**

- Verify Google Drive folder permissions
- Check document formats are supported
- Ensure Pinecone credentials are valid

**Fire Detection Issues**

- Review scoring criteria and thresholds
- Check due dates and status fields
- Verify blocker flags are set correctly

**Export Problems**

- Ensure user has permission to export
- Check for large datasets that may timeout
- Verify CSV formatting for special characters

### Debug Mode

Enable debug logging:

```env
DEBUG=raid-monitoring:*
```

## Performance Considerations

### Database Indexes

- Optimized indexes for common queries
- Composite indexes for filtering operations
- Priority score ordering for performance

### Scalability

- Efficient chunking for large documents
- Background job processing
- Incremental updates for continuous sync

## Future Enhancements

### Planned Features

- **Real-time Notifications**: Email/Slack alerts for new fires
- **Advanced Analytics**: Trend analysis and reporting
- **Collaborative Features**: Multi-user RAID management
- **Integration APIs**: Connect with Jira, Asana, etc.
- **Mobile App**: Native mobile interface

### Technical Improvements

- **Background Workers**: Redis/Bull for job processing
- **Caching**: Redis for improved performance
- **WebSockets**: Real-time updates
- **Advanced AI**: Better extraction and scoring algorithms

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review application logs for error details
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied
5. Check Google Drive and Pinecone connectivity

The RAID Monitoring Tool provides comprehensive risk management capabilities with intelligent fire detection and seamless integration with your existing project planning workflow.
