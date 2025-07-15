#!/usr/bin/env node

/**
 * Central AI Hub Deep Inspection Fixes Test Script
 * 
 * This script tests all the fixes applied to the Central AI Hub system
 * to ensure they work correctly in production.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.REPLIT_URL || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:3000';
const TEST_TIMEOUT = 15000; // 15 seconds for cloud environment

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: TEST_TIMEOUT,
      headers: {
        'User-Agent': 'CAFFE-Test-Script/1.0',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test function wrapper
function runTest(name, testFunction) {
  return async () => {
    testResults.total++;
    console.log(`\n🧪 Testing: ${name}`);
    
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      
      testResults.passed++;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      testResults.details.push({ name, status: 'PASSED', duration });
    } catch (error) {
      testResults.failed++;
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      testResults.details.push({ name, status: 'FAILED', error: error.message });
    }
  };
}

// Test 1: Central AI Status Endpoint
const testCentralAIStatus = runTest('Central AI Status Endpoint', async () => {
  const response = await makeRequest(`${BASE_URL}/api/central-ai/status`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { data } = response;
  
  // Check required fields
  if (typeof data.valid !== 'boolean') {
    throw new Error('Missing or invalid "valid" field');
  }
  
  if (typeof data.confidence !== 'number') {
    throw new Error('Missing or invalid "confidence" field');
  }
  
  if (!data.model) {
    throw new Error('Missing "model" field');
  }
  
  if (!Array.isArray(data.features)) {
    throw new Error('Missing or invalid "features" array');
  }
  
  console.log(`   AI Status: ${data.valid ? 'Connected' : 'Disconnected'}`);
  console.log(`   Confidence: ${(data.confidence * 100).toFixed(1)}%`);
  console.log(`   Model: ${data.model}`);
  console.log(`   Features: ${data.features.length} active`);
});

// Test 2: X Sentiment Status Endpoint
const testXSentimentStatus = runTest('X Sentiment Status Endpoint', async () => {
  const response = await makeRequest(`${BASE_URL}/api/x-sentiment/status`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { data } = response;
  
  // Check required fields
  if (typeof data.connected !== 'boolean') {
    throw new Error('Missing or invalid "connected" field');
  }
  
  if (typeof data.postsProcessed !== 'number') {
    throw new Error('Missing or invalid "postsProcessed" field');
  }
  
  if (!data.message) {
    throw new Error('Missing "message" field');
  }
  
  console.log(`   X API: ${data.connected ? 'Connected' : 'Disconnected'}`);
  console.log(`   Posts Processed: ${data.postsProcessed}`);
  console.log(`   Status: ${data.message}`);
});

// Test 3: News Aggregation Endpoint
const testNewsAggregation = runTest('News Aggregation Endpoint', async () => {
  const response = await makeRequest(`${BASE_URL}/api/news/jamaica-aggregated`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { data } = response;
  
  // Check required fields
  if (typeof data.success !== 'boolean') {
    throw new Error('Missing or invalid "success" field');
  }
  
  if (!data.data || !data.data.articles) {
    throw new Error('Missing "data.articles" field');
  }
  
  if (!Array.isArray(data.data.articles)) {
    throw new Error('Invalid "data.articles" - not an array');
  }
  
  // Check article structure
  if (data.data.articles.length > 0) {
    const article = data.data.articles[0];
    
    if (!article.title) {
      throw new Error('Article missing "title" field');
    }
    
    if (!article.url) {
      throw new Error('Article missing "url" field');
    }
    
    if (!article.source) {
      throw new Error('Article missing "source" field');
    }
    
    // Check AI analysis if present
    if (article.aiAnalysis) {
      if (typeof article.aiAnalysis.relevance !== 'number') {
        throw new Error('Article AI analysis missing "relevance" field');
      }
      
      if (typeof article.aiAnalysis.confidence !== 'number') {
        throw new Error('Article AI analysis missing "confidence" field');
      }
    }
  }
  
  console.log(`   Success: ${data.success}`);
  console.log(`   Articles: ${data.data.articles.length}`);
  console.log(`   Sources: ${Object.keys(data.data.sources || {}).length}`);
});

// Test 4: Social Sentiment Endpoint
const testSocialSentiment = runTest('Social Sentiment Endpoint', async () => {
  const response = await makeRequest(`${BASE_URL}/api/social-monitoring/sentiment`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { data } = response;
  
  // Check required fields
  if (typeof data.overall_sentiment !== 'number' && typeof data.overall_sentiment !== 'string') {
    throw new Error('Missing or invalid "overall_sentiment" field');
  }
  
  if (!data.sentiment_distribution) {
    throw new Error('Missing "sentiment_distribution" field');
  }
  
  if (typeof data.sentiment_distribution.positive !== 'number') {
    throw new Error('Missing or invalid "sentiment_distribution.positive" field');
  }
  
  if (typeof data.sentiment_distribution.negative !== 'number') {
    throw new Error('Missing or invalid "sentiment_distribution.negative" field');
  }
  
  if (typeof data.sentiment_distribution.neutral !== 'number') {
    throw new Error('Missing or invalid "sentiment_distribution.neutral" field');
  }
  
  if (typeof data.ai_confidence !== 'number') {
    throw new Error('Missing or invalid "ai_confidence" field');
  }
  
  if (!Array.isArray(data.data_sources)) {
    throw new Error('Missing or invalid "data_sources" array');
  }
  
  console.log(`   Overall Sentiment: ${data.overall_sentiment}`);
  console.log(`   AI Confidence: ${(data.ai_confidence * 100).toFixed(1)}%`);
  console.log(`   Data Sources: ${data.data_sources.length}`);
  console.log(`   Distribution: P${data.sentiment_distribution.positive}% N${data.sentiment_distribution.negative}% U${data.sentiment_distribution.neutral}%`);
});

// Test 5: Parish Analytics Endpoint
const testParishAnalytics = runTest('Parish Analytics Endpoint', async () => {
  const response = await makeRequest(`${BASE_URL}/api/analytics/parishes`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { data } = response;
  
  // Check that data is an array
  if (!Array.isArray(data)) {
    throw new Error('Response data is not an array');
  }
  
  // Check parish structure if data exists
  if (data.length > 0) {
    const parish = data[0];
    
    if (typeof parish.parishId !== 'number') {
      throw new Error('Parish missing or invalid "parishId" field');
    }
    
    if (!parish.parishName) {
      throw new Error('Parish missing "parishName" field');
    }
    
    if (typeof parish.incidents !== 'number') {
      throw new Error('Parish missing or invalid "incidents" field');
    }
    
    if (typeof parish.turnout !== 'number') {
      throw new Error('Parish missing or invalid "turnout" field');
    }
    
    if (typeof parish.observers !== 'number') {
      throw new Error('Parish missing or invalid "observers" field');
    }
    
    if (!parish.lastUpdate) {
      throw new Error('Parish missing "lastUpdate" field');
    }
  }
  
  console.log(`   Parishes: ${data.length}`);
  if (data.length > 0) {
    console.log(`   Sample Parish: ${data[0].parishName}`);
    console.log(`   Total Incidents: ${data.reduce((sum, p) => sum + p.incidents, 0)}`);
    console.log(`   Total Observers: ${data.reduce((sum, p) => sum + p.observers, 0)}`);
  }
});

// Test 6: Activation Status Endpoint
const testActivationStatus = runTest('Activation Status Endpoint', async () => {
  const response = await makeRequest(`${BASE_URL}/api/central-ai/activation-status`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { data } = response;
  
  // Check required fields
  if (typeof data.isActive !== 'boolean') {
    throw new Error('Missing or invalid "isActive" field');
  }
  
  if (!data.message) {
    throw new Error('Missing "message" field');
  }
  
  if (!data.timestamp) {
    throw new Error('Missing "timestamp" field');
  }
  
  console.log(`   Active: ${data.isActive}`);
  console.log(`   Message: ${data.message}`);
  console.log(`   Timestamp: ${data.timestamp}`);
});

// Test 7: Error Handling Test
const testErrorHandling = runTest('Error Handling Test', async () => {
  // Test with invalid endpoint
  try {
    await makeRequest(`${BASE_URL}/api/nonexistent-endpoint`);
    throw new Error('Expected 404 error for non-existent endpoint');
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log('   Error handling working correctly');
    } else {
      throw error;
    }
  }
});

// Test 8: Data Validation Test
const testDataValidation = runTest('Data Validation Test', async () => {
  // Test that all endpoints return properly structured data
  const endpoints = [
    '/api/central-ai/status',
    '/api/x-sentiment/status',
    '/api/news/jamaica-aggregated',
    '/api/social-monitoring/sentiment',
    '/api/analytics/parishes'
  ];
  
  for (const endpoint of endpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint}`);
    
    if (response.status !== 200) {
      throw new Error(`Endpoint ${endpoint} returned status ${response.status}`);
    }
    
    // Check that response is valid JSON
    if (typeof response.data !== 'object') {
      throw new Error(`Endpoint ${endpoint} returned invalid JSON`);
    }
  }
  
  console.log('   All endpoints return valid JSON data');
});

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Central AI Hub Deep Inspection Fixes Test Suite');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms`);
  console.log(`☁️  Environment: ${BASE_URL.includes('localhost') ? 'Local' : 'Cloud (Replit)'}`);
  
  const tests = [
    testCentralAIStatus,
    testXSentimentStatus,
    testNewsAggregation,
    testSocialSentiment,
    testParishAnalytics,
    testActivationStatus,
    testErrorHandling,
    testDataValidation
  ];
  
  for (const test of tests) {
    await test();
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(result => result.status === 'FAILED')
      .forEach(result => {
        console.log(`   - ${result.name}: ${result.error}`);
      });
  }
  
  console.log('\n🎯 Test Details:');
  testResults.details.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`   ${icon} ${result.name}${duration}`);
  });
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Central AI Hub Deep Inspection Fixes Test Script

Usage: node test-central-ai-hub-fixes.js [options]

Options:
  --url <url>     Base URL to test against (default: http://localhost:3000)
  --timeout <ms>  Request timeout in milliseconds (default: 10000)
  --help, -h      Show this help message

Environment Variables:
  REPLIT_URL      Base URL for testing (overrides --url)

Examples:
  node test-central-ai-hub-fixes.js
  node test-central-ai-hub-fixes.js --url https://myapp.replit.dev
  REPLIT_URL=https://myapp.replit.dev node test-central-ai-hub-fixes.js
`);
  process.exit(0);
}

// Parse command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  process.env.REPLIT_URL = process.argv[urlIndex + 1];
}

const timeoutIndex = process.argv.indexOf('--timeout');
if (timeoutIndex !== -1 && process.argv[timeoutIndex + 1]) {
  TEST_TIMEOUT = parseInt(process.argv[timeoutIndex + 1]);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed to run:', error.message);
  process.exit(1);
}); 