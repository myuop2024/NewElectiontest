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

## Changelog
- June 13, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.