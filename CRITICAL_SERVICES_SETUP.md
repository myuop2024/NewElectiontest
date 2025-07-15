# Critical Services Setup for Central AI Hub

## Overview
The Central AI Hub requires several critical services to be properly configured for real electoral observation data. **No fallback or mock data is used** - all services must be functional for credible electoral monitoring.

## Required API Keys & Services

### 1. Google Gemini AI (Central AI Service)
**Purpose**: Core AI analysis engine for incident classification, sentiment analysis, and intelligence reports
**Required Environment Variable**: `GEMINI_API_KEY`
**Setup**:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to Replit secrets: `GEMINI_API_KEY`

### 2. Grok AI (X Sentiment Analysis)
**Purpose**: Advanced social media sentiment analysis for X (Twitter) posts
**Required Environment Variable**: `GROK_API_KEY`
**Setup**:
1. Access Grok AI API (requires xAI subscription)
2. Generate API key
3. Add to Replit secrets: `GROK_API_KEY`

### 3. X (Twitter) API v2
**Purpose**: Real-time social media monitoring and data collection
**Required Environment Variables**:
- `X_API_KEY`
- `X_API_SECRET` 
- `X_BEARER_TOKEN`
**Setup**:
1. Apply for X API access at [developer.twitter.com](https://developer.twitter.com)
2. Create app and generate credentials
3. Add to Replit secrets:
   - `X_API_KEY`
   - `X_API_SECRET`
   - `X_BEARER_TOKEN`

### 4. News API
**Purpose**: Jamaica news aggregation and analysis
**Required Environment Variables**:
- `NEWS_API_KEY`
- `NEWSAPI_KEY`
**Setup**:
1. Get API key from [newsapi.org](https://newsapi.org)
2. Add to Replit secrets: `NEWS_API_KEY` and `NEWSAPI_KEY`

### 5. Google Cloud Services (Analytics)
**Purpose**: BigQuery analytics and predictive insights
**Required Environment Variables**:
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_KEY_FILE`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
**Setup**:
1. Create Google Cloud project
2. Enable BigQuery API
3. Create service account and download JSON key
4. Add to Replit secrets

## Service Dependencies

### Central AI Service Dependencies
- ✅ Google Gemini API (Primary)
- ✅ Database connection (Replit managed)
- ✅ Storage service (Replit managed)

### X Sentiment Service Dependencies
- ✅ Grok AI API (Primary sentiment analysis)
- ✅ X API v2 (Data collection)
- ✅ Database connection (Replit managed)

### Social Monitoring Service Dependencies
- ✅ News API (News aggregation)
- ✅ X API (Social media monitoring)
- ✅ Central AI Service (Analysis)

### Analytics Service Dependencies
- ✅ Google Cloud BigQuery (Data storage)
- ✅ Database connection (Replit managed)

## Verification Steps

### 1. Check Service Status
Visit `/central-ai-hub` and verify:
- AI Engine shows "Active" (green checkmark)
- Social Monitoring shows "Connected" (green checkmark)
- News Feed shows "Active" (green checkmark)

### 2. Test API Endpoints
```bash
# Test Central AI Service
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-replit-url.replit.dev/api/central-ai/status

# Test X Sentiment Service
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-replit-url.replit.dev/api/x-sentiment/status

# Test News Aggregation
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-replit-url.replit.dev/api/news/jamaica-aggregated
```

### 3. Monitor Real-time Data
- Check `/central-ai-hub` Overview tab for real sentiment data
- Verify X Sentiment Dashboard shows actual social media analysis
- Confirm parish heat map displays real monitoring data

## Error Handling

### Service Not Available
If a service shows "Offline" or "Disconnected":
1. Check API key configuration in Replit secrets
2. Verify API quotas and rate limits
3. Check service-specific error logs
4. Ensure proper authentication

### No Data Displayed
If components show "No data available":
1. Verify API endpoints are responding
2. Check database connectivity
3. Ensure services are actively collecting data
4. Review service-specific configuration

## Security Considerations

### API Key Management
- Store all API keys in Replit secrets (not in code)
- Rotate keys regularly
- Monitor API usage and quotas
- Use least-privilege access

### Data Privacy
- All electoral data is encrypted in transit and at rest
- API keys are never exposed to client-side code
- User authentication required for all endpoints
- Audit logging enabled for all critical operations

## Troubleshooting

### Common Issues

1. **"Service not configured" errors**
   - Check if API keys are set in Replit secrets
   - Verify environment variable names match exactly

2. **Rate limiting errors**
   - Check API quotas and usage limits
   - Implement proper retry logic
   - Consider upgrading API plans

3. **Authentication failures**
   - Verify JWT token is valid
   - Check user permissions
   - Ensure proper session management

4. **Database connection issues**
   - Replit handles database automatically
   - Check if database is accessible
   - Verify schema migrations are complete

## Monitoring & Alerts

### Service Health Monitoring
- Real-time status indicators on Central AI Hub
- Automatic retry mechanisms for failed requests
- Error logging and alerting
- Performance metrics tracking

### Data Quality Assurance
- Input validation for all API responses
- Data consistency checks
- Automated error detection
- Quality scoring for sentiment analysis

## Support

For technical support with service configuration:
1. Check service-specific documentation
2. Review error logs in Replit console
3. Verify API documentation for each service
4. Contact service providers for API-specific issues

---

**Important**: This electoral observation platform requires all critical services to be functional for credible operation. No mock data or fallbacks are used to ensure data integrity and reliability. 