# Project Plan Builder - Setup Guide

## Overview

The Project Plan Builder is a powerful AI-powered tool that analyzes client documents from Google Drive and generates comprehensive project plans. It features BYOK (Bring Your Own Keys) integration with Google Drive, Pinecone, and OpenAI.

## Features

### Core Capabilities

- **Google Drive Integration**: Connect and analyze client documents
- **Pinecone Vector Database**: Store and retrieve document knowledge
- **AI-Powered Analysis**: Extract knowledge cards from documents
- **Automated Plan Generation**: Create professional project plans
- **Multi-Format Export**: Download plans as PDF or DOCX
- **Sufficiency Reporting**: Identify missing information and conflicts

### Security Features

- **AES-GCM Encryption**: All user credentials encrypted at rest
- **Multi-Tenant Isolation**: Each user's data is completely isolated
- **BYOK Support**: Users provide their own API keys
- **Row Level Security**: Database-level access control

## Setup Instructions

### 1. Database Setup

Apply the database migration to create all necessary tables:

```sql
-- Run this in your Supabase SQL editor
-- File: create-project-plan-builder-tables.sql
```

This creates:

- `project_plan_builder_credentials` - Encrypted user credentials
- `project_plan_builder_jobs` - Analysis job tracking
- `project_plan_builder_plans` - Generated project plans
- `project_plan_builder_knowledge_cards` - Extracted knowledge
- `project_plan_builder_document_chunks` - Document chunks for vector storage

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# Google OAuth (required for Drive integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/project-plan-builder/auth/google/callback

# Encryption key for user credentials (generate a secure random string)
ENCRYPTION_KEY=your_secure_encryption_key_here

# OpenAI API key (optional - users can provide their own)
OPENAI_API_KEY=your_openai_api_key

# Site URL for OAuth redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API and Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/project-plan-builder/auth/google/callback`
6. Copy Client ID and Secret to your `.env.local`

### 4. Dependencies

Install required packages:

```bash
npm install @pinecone-database/pinecone googleapis openai uuid
npm install --save-dev @types/uuid
```

## User Workflow

### Step 1: Connect Services

1. User navigates to Business Hacks → Project Plan Builder
2. Connects Google Drive via OAuth
3. Adds Pinecone API key and project ID
4. Optionally adds OpenAI API key

### Step 2: Start Analysis

1. User provides Google Drive folder URL
2. Enters client name and project name
3. Clicks "Start Analysis"
4. System processes documents and extracts knowledge cards

### Step 3: Review Sufficiency Report

1. System generates coverage percentages for different knowledge types
2. Identifies missing information and conflicts
3. Shows critical warnings that block plan generation
4. User acknowledges warnings if any

### Step 4: Generate Project Plan

1. User clicks "Generate Plan" after analysis completes
2. AI retrieves relevant information via RAG
3. Creates comprehensive project plan with citations
4. Plan is available for download in multiple formats

## Technical Architecture

### Frontend Components

- **Settings Tab**: Credential management and connection status
- **Analyze Tab**: Folder selection and job monitoring
- **Plans Tab**: Generated plans and downloads
- **Dashboard Tab**: Overview statistics

### API Routes

- `/api/project-plan-builder/credentials` - Manage user credentials
- `/api/project-plan-builder/auth/google` - Google OAuth flow
- `/api/project-plan-builder/analyze` - Start document analysis
- `/api/project-plan-builder/jobs` - Monitor analysis jobs
- `/api/project-plan-builder/generate` - Generate project plans
- `/api/project-plan-builder/plans` - Manage generated plans

### Server Libraries

- **Drive Client**: Google Drive API integration
- **Pinecone Client**: Vector database operations
- **AI Service**: Knowledge extraction and plan generation
- **Text Chunker**: Document processing and chunking
- **Crypto**: AES-GCM encryption for credentials

### Data Flow

1. User connects Google Drive → OAuth flow → Encrypted token storage
2. User starts analysis → Drive folder processing → Text extraction
3. AI extracts knowledge cards → Pinecone vector storage
4. Sufficiency analysis → Coverage report → Warning generation
5. Plan generation → RAG retrieval → AI plan creation → Export

## Security Considerations

### Encryption

- All user credentials encrypted with AES-GCM
- Encryption key stored in environment variables
- Each user's data isolated by user ID

### Access Control

- Row Level Security (RLS) on all tables
- Users can only access their own data
- API routes verify user authentication

### Data Isolation

- Pinecone namespaces: `{userId}:{clientName}:{projectName}`
- Database queries filtered by user ID
- No cross-user data access possible

## Future Enhancements

### Planned Features

- **Real-time Progress Updates**: WebSocket connections for live job status
- **Advanced Document Processing**: Support for more file types
- **Collaborative Planning**: Multi-user plan editing
- **Template Library**: Pre-built plan templates
- **Integration APIs**: Connect with project management tools

### Technical Improvements

- **Background Job Queue**: Redis/Bull for job processing
- **File Storage**: S3/GCS for generated plans
- **Caching**: Redis for improved performance
- **Monitoring**: Application metrics and logging

## Troubleshooting

### Common Issues

**Google OAuth Errors**

- Verify redirect URI matches exactly
- Check client ID and secret are correct
- Ensure Google Drive API is enabled

**Pinecone Connection Issues**

- Verify API key and project ID
- Check Pinecone environment setting
- Ensure sufficient quota

**Analysis Job Failures**

- Check document permissions in Google Drive
- Verify file formats are supported
- Review error logs for specific issues

**Plan Generation Failures**

- Ensure analysis job completed successfully
- Check for critical warnings that need acknowledgment
- Verify OpenAI API key is working

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=project-plan-builder:*
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review application logs for error details
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied

The Project Plan Builder is designed to be robust and secure while providing powerful AI-driven project planning capabilities. Each user's data is completely isolated, and all sensitive information is encrypted at rest.
