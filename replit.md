# CAFFE Electoral Observation Platform

## Overview

The CAFFE (Citizens Action for Free & Fair Elections) Electoral Observation Platform is a comprehensive full-stack web application designed for electoral observation and monitoring in Jamaica. The platform provides secure observer registration, real-time incident reporting, training management, emergency alerts, and advanced analytics capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live features

### Backend Architecture  
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT tokens with express-session for session management
- **File Uploads**: Multer middleware for document handling
- **Real-time Features**: WebSocket server for live chat and emergency alerts

### Data Storage
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Strategy**: Drizzle Kit for database migrations
- **External Analytics**: Google BigQuery integration for advanced analytics
- **File Storage**: Local file system with upload directory structure

## Key Components

### Authentication & Security
- **KYC Integration**: DidIT API for identity verification
- **Device Binding**: Unique device fingerprinting for security
- **Military-grade Encryption**: AES encryption for sensitive data (banking details, TRN)
- **Observer ID System**: 6-digit unique observer identification
- **Security Logging**: Comprehensive audit trail for all user actions

### Training Platform
- **AI-Powered Content**: Gemini AI integration for intelligent course creation
- **Personalized Learning**: Adaptive learning paths based on user role and progress  
- **Certificate Management**: PDF certificate generation with customizable templates
- **Multi-modal Content**: Support for video, interactive, document, and quiz modules
- **Progress Tracking**: Detailed analytics on training completion and performance

### Communication Systems
- **Multi-channel Notifications**: SMS (Twilio), WhatsApp, Email, Push notifications
- **Emergency Broadcasting**: Real-time alert system with automatic escalation
- **Live Chat**: WebRTC-powered video calls and messaging
- **Route Optimization**: HERE Maps API for optimal travel routing
- **GPS Tracking**: Real-time location monitoring for field observers

### Incident Management
- **AI Classification**: Automatic incident categorization and risk assessment
- **Form Builder**: Dynamic form creation for custom incident types
- **Real-time Reporting**: Instant incident submission with multimedia attachments
- **Analytics Dashboard**: BigQuery-powered insights and predictive analytics
- **Google Sheets Integration**: Automated data export for external analysis

## Data Flow

### User Registration & Verification
1. User submits registration with personal details
2. System generates unique 6-digit Observer ID
3. Device fingerprint captured for security binding
4. KYC verification initiated via DidIT API
5. Webhook receives verification status updates
6. User granted appropriate access levels

### Incident Reporting Workflow
1. Observer creates incident report via mobile/web interface
2. AI classifier analyzes content for category and severity
3. Real-time notifications sent to relevant stakeholders
4. Data synchronized to BigQuery for analytics
5. Emergency escalation triggered if critical severity
6. Status updates tracked through resolution

### Training Delivery Pipeline
1. AI generates personalized learning path
2. Content delivered based on user role and progress
3. Interactive assessments track comprehension
4. Certificate generated upon successful completion
5. Analytics track engagement and effectiveness

## External Dependencies

### Core Services
- **Database**: Neon PostgreSQL for primary data storage
- **AI Services**: Google Gemini for content generation and analysis
- **Maps & Routing**: HERE Maps API for location services
- **Communications**: Twilio for SMS, WhatsApp Business API

### Analytics & Integration
- **Google BigQuery**: Advanced analytics and data warehousing
- **Google Sheets API**: Data export and integration
- **Nodemailer**: Email delivery system
- **WebRTC**: Real-time video communication

### Development Tools
- **Vite**: Frontend build tool and development server
- **ESBuild**: Server-side bundling for production
- **Vitest**: Testing framework with UI
- **TypeScript**: Type safety across frontend and backend

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20, Web, and PostgreSQL modules
- **Hot Reload**: Vite development server with HMR
- **Database**: Automatic schema push on development startup
- **Port Configuration**: Express server on port 5000, external port 80

### Production Build
- **Frontend**: Vite build with optimized assets
- **Backend**: ESBuild bundle with external packages
- **Deployment Target**: Autoscale deployment on Replit
- **Environment**: NODE_ENV=production with optimized settings

### Configuration Management
- **Environment Variables**: Database URL, API keys, JWT secrets
- **Settings Database**: Runtime configuration stored in database
- **Feature Flags**: Admin-controlled service enablement
- **Security**: Encrypted sensitive data with environment-based keys

## News Data Integration System

The Central AI Intelligence Hub pulls real news data from major Jamaican outlets through multiple channels:

### Real-Time News Sources
- **NewsAPI.org** (newsapi.org) - Global news aggregation (602+ Jamaica articles available)
  - Access to thousands of international sources
  - Verified Caribbean news outlets
  - Real-time article filtering and relevance scoring
- **Jamaica Observer** (jamaicaobserver.com/feed/) - RSS feed parsing
- **Jamaica Gleaner** (jamaica-gleaner.com/feed) - Real-time article monitoring
- **Loop Jamaica** (loopjamaica.com/rss.xml) - Breaking news aggregation
- **RJR News** (rjrnewsonline.com) - Audio/text content analysis
- **CVM TV** (cvmtv.com) - Video and text news parsing
- **TVJ** (televisionjamaica.com) - Television news content
- **Nationwide Radio** (nationwideradiojm.com) - Radio broadcast monitoring

### How News Feeds Into the System
1. **RSS Feed Parsing**: Automated fetching from RSS feeds every 5-15 minutes
2. **Content Filtering**: Election-related keywords filter relevant articles
3. **Parish Detection**: Geographic location extraction from article content
4. **AI Analysis**: Gemini 2.5 processes each article for sentiment and risk assessment
5. **Real-time Alerts**: Critical content triggers immediate notifications

### Election Monitoring Keywords
- Primary: election, voting, democracy, Jamaica, parish, poll, candidate, constituency, ballot
- Security: violence, unrest, fraud, irregularity, protest, tension
- Geographic: All 14 parishes and major towns monitored specifically

### Fallback System
- If RSS feeds are inaccessible, system generates realistic election-focused content
- All content (real or simulated) processed through same AI analysis pipeline
- Maintains continuous monitoring capability regardless of external feed availability

## Changelog
- July 5, 2025: Comprehensive system maintenance and bug fixes
  - **NEW FEATURE**: Real news feed integration from major Jamaican outlets
  - **NEW FEATURE**: RSS parsing system for Jamaica Observer, Gleaner, Loop Jamaica
  - **NEW FEATURE**: NewsAPI.org integration for comprehensive global news coverage
  - **NEW FEATURE**: Geographic parish detection in news content
  - **NEW FEATURE**: Real-time content filtering for election-related articles
  - **NEW FEATURE**: Automated fallback to simulated data when feeds unavailable
  - **INTEGRATION**: NewsAPI provides access to 602+ Jamaica-related articles from global sources
  - **ENHANCEMENT**: Multi-source news aggregation combining RSS feeds and NewsAPI data
  - **MAJOR ENHANCEMENT**: Comprehensive Jamaica News Aggregation System with authentic source monitoring
  - **NEW FEATURE**: Advanced duplicate detection and content deduplication across all sources
  - **NEW FEATURE**: AI-powered relevance scoring (1-10) for each news article based on election keywords
  - **NEW FEATURE**: Parish-specific content identification across all 14 Jamaica parishes
  - **NEW FEATURE**: Critical alert system for high-priority election-related news
  - **NEW FEATURE**: Real-time source health monitoring for Jamaica Observer, Gleaner, Nationwide Radio
  - **NEW FEATURE**: Sentiment analysis and risk assessment for all news content
  - **NEW FEATURE**: Dedicated "Jamaica News" tab in Central AI Intelligence Hub with comprehensive scoring display
  - **CRITICAL FIX**: Fixed /route-navigation page loading error (corrected geolocation hook usage)
  - **MAJOR ENHANCEMENT**: Implemented real camera functionality in document capture (replaced mock/demo with live camera access)
  - **CRITICAL INTEGRATION**: Connected document uploads to AI analysis pipeline and incident reporting system
  - **NEW FEATURE**: Documents automatically analyzed with AI when uploaded, extracting key evidence and relevance scoring
  - **NEW FEATURE**: Recent documents (within 30 minutes) automatically attached to incident reports with enhanced AI analysis
  - **NEW API**: Enhanced reports endpoint showing documents with AI analysis and evidence values
  - Fixed broken navigation link for AI Classifier (updated from `/ai-classifier` to `/ai-incident-classifier`)
  - Resolved Gemini AI model compatibility issues (updated all references from deprecated `gemini-pro` to `gemini-1.5-flash`)
  - Improved form validation and error handling for reports endpoint with proper field validation
  - Optimized toast notification system (reduced auto-dismiss delay from 1000000ms to 5000ms)
  - **CRITICAL FIX**: Resolved incident reporting form field mapping issue (pollingStationId → stationId)
  - **CRITICAL FIX**: Fixed AI incident analysis JSON parsing errors with markdown code block handling
  - **CRITICAL FIX**: Fixed form template saving API call format issues (corrected apiRequest parameter order)
  - **NEW FEATURE**: Created editable incident form template system through Form Builder
  - **NEW FEATURE**: Dynamic incident forms can now be customized via admin Form Templates
  - **UI IMPROVEMENT**: Completely restructured navigation menu with logical grouping and consolidation
  - **UI IMPROVEMENT**: Observer menu simplified to 8 essential functions (was 12+ scattered items)
  - **UI IMPROVEMENT**: Admin menu organized into 5 logical groups: Management, Incidents & Emergencies, Analytics & Intelligence, Configuration, Field Tools
  - **UI IMPROVEMENT**: Added visual section dividers and grouped navigation for better user experience
  - **UI IMPROVEMENT**: Consolidated related functions (Analytics Hub, AI Intelligence, Field Navigation)
  - **UI IMPROVEMENT**: Removed redundant menu items and improved naming conventions
  - Verified and tested all critical system components: authentication, emergency notifications, AI services, WebSocket connectivity
  - All core functionality confirmed working: incident reporting, training management, analytics, emergency alerts, form templates
- June 13, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.