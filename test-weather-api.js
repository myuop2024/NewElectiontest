import { getWeatherService } from './server/lib/weather-service.ts';

async function testWeatherAPI() {
  try {
    console.log('Testing Weather API...');
    
    // Test if API key exists
    const apiKey = process.env.GOOGLE_WEATHER_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    
    // Get weather service instance
    const weatherService = getWeatherService();
    console.log('Weather service created successfully');
    
    // Test getting weather summary for St. Thomas (what the frontend actually uses)
    console.log('\nTesting St. Thomas weather summary...');
    const stThomasSummary = await weatherService.getElectoralWeatherSummary('St. Thomas');
    console.log('St. Thomas weather summary:', JSON.stringify(stThomasSummary, null, 2));
    
  } catch (error) {
    console.error('Weather API test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

testWeatherAPI();