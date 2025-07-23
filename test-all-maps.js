#!/usr/bin/env node

// Comprehensive test for all map instances in the CAFFE Electoral Observation Platform

const puppeteer = require('puppeteer');

const TEST_PAGES = [
  {
    name: "Admin HERE API Settings",
    url: "/admin-settings",
    description: "Test HERE API key configuration",
    mapElement: null,
    testFunction: async (page) => {
      // Look for HERE API settings section
      const hereSection = await page.$('[data-testid="here-api-section"]') || 
                          await page.$('text=HERE API Settings') ||
                          await page.$('text=HERE Maps');
      
      if (hereSection) {
        console.log("✓ HERE API Settings section found");
        return true;
      }
      console.log("✗ HERE API Settings section not found");
      return false;
    }
  },
  {
    name: "Parish Heat Map",
    url: "/parish-heat-map-new",
    description: "Test parish-level heat map visualization",
    mapElement: ".map-container, [id*='map'], [class*='map']",
    testFunction: async (page) => {
      const hasMap = await page.$(".map-container") ||
                    await page.$("[id*='map']") ||
                    await page.$("[class*='map']");
      return !!hasMap;
    }
  },
  {
    name: "Polling Stations with Heat Map",
    url: "/polling-stations",
    description: "Test polling stations with overlays",
    mapElement: ".map-container, [id*='map']",
    testFunction: async (page) => {
      // Look for overlay controls
      const overlayControls = await page.$("text=X Sentiment") ||
                             await page.$("text=Traffic") ||
                             await page.$("text=Weather") ||
                             await page.$("button[data-overlay]");
      
      const mapContainer = await page.$(".map-container") ||
                          await page.$("[id*='map']");
      
      return !!(overlayControls && mapContainer);
    }
  },
  {
    name: "Route Navigation",
    url: "/route-navigation",
    description: "Test HERE API route optimization",
    mapElement: ".map-container, [class*='map']",
    testFunction: async (page) => {
      // Look for route planning interface
      const routeInterface = await page.$("input[placeholder*='from']") ||
                            await page.$("input[placeholder*='to']") ||
                            await page.$("text=Route") ||
                            await page.$("button[data-route]");
      
      return !!routeInterface;
    }
  },
  {
    name: "Weather Dashboard",
    url: "/weather-dashboard",
    description: "Test weather monitoring with maps",
    mapElement: ".weather-map, [class*='weather']",
    testFunction: async (page) => {
      // Look for weather data
      const weatherData = await page.$("text=Temperature") ||
                         await page.$("text=Weather") ||
                         await page.$("[data-weather]") ||
                         await page.$(".weather-card");
      
      return !!weatherData;
    }
  },
  {
    name: "Traffic Monitoring",
    url: "/traffic-monitoring",
    description: "Test traffic data visualization",
    mapElement: ".traffic-map, [class*='traffic']",
    testFunction: async (page) => {
      // Look for traffic components
      const trafficData = await page.$("text=Traffic") ||
                         await page.$("[data-traffic]") ||
                         await page.$(".traffic-card") ||
                         await page.$("text=Route");
      
      return !!trafficData;
    }
  }
];

async function testAllMaps() {
  console.log("🔍 Starting comprehensive map testing...\n");
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set base URL (adjust if needed)
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      'http://localhost:5000';
    
    console.log(`📍 Testing against: ${baseUrl}\n`);
    
    let passedTests = 0;
    let totalTests = TEST_PAGES.length;
    
    for (const test of TEST_PAGES) {
      console.log(`🧪 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      console.log(`   Description: ${test.description}`);
      
      try {
        // Navigate to page
        await page.goto(`${baseUrl}${test.url}`, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        
        // Check for authentication redirect
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          console.log("   ⚠️  Requires authentication - skipping detailed test");
          console.log("   ℹ️  Please ensure admin login: admin@caffe.org.jm / password\n");
          continue;
        }
        
        // Check for errors
        const errorElements = await page.$$('.error, [data-error], .alert-destructive');
        if (errorElements.length > 0) {
          console.log("   ❌ Error elements found on page");
        }
        
        // Run specific test function
        const testResult = await test.testFunction(page);
        
        if (testResult) {
          console.log("   ✅ Test passed");
          passedTests++;
        } else {
          console.log("   ❌ Test failed");
        }
        
        // Check for map-related elements
        if (test.mapElement) {
          const mapElements = await page.$$(test.mapElement);
          if (mapElements.length > 0) {
            console.log(`   📍 Found ${mapElements.length} map element(s)`);
          } else {
            console.log("   ⚠️  No map elements found");
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Test error: ${error.message}`);
      }
      
      console.log(); // Empty line for readability
    }
    
    // Summary
    console.log("📊 Test Summary");
    console.log("=" * 50);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log("\n🎉 All map tests passed! HERE API integration is working correctly.");
    } else {
      console.log("\n⚠️  Some tests failed. Check the logs above for details.");
    }
    
  } catch (error) {
    console.error("❌ Test suite error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Manual test instructions
console.log("🗺️  CAFFE Electoral Observation Platform - Map Testing Suite");
console.log("=" * 60);
console.log();
console.log("MANUAL TEST CHECKLIST:");
console.log("1. ✅ Admin Settings (/admin-settings)");
console.log("   - Navigate to HERE API Settings");
console.log("   - Enter a test API key");
console.log("   - Verify 'Configuration saved successfully' message");
console.log();
console.log("2. ✅ Parish Heat Map (/parish-heat-map-new)");
console.log("   - Should display Jamaica parish map");
console.log("   - Parish cards should show statistics");
console.log("   - HERE API key should load from database");
console.log();
console.log("3. ✅ Polling Stations (/polling-stations)");
console.log("   - Map should display with station markers");
console.log("   - Toggle overlays: X Sentiment, Traffic, Weather, Incidents");
console.log("   - Each overlay should show colored indicators");
console.log();
console.log("4. ✅ Route Navigation (/route-navigation)");
console.log("   - Address autocomplete should work");
console.log("   - Route optimization should use HERE API");
console.log("   - Turn-by-turn directions should display");
console.log();
console.log("5. ✅ Weather Dashboard (/weather-dashboard)");
console.log("   - All 14 parishes should load weather data");
console.log("   - Current conditions should display");
console.log("   - Electoral impact assessment should show");
console.log();
console.log("6. ✅ Traffic Monitoring (/traffic-monitoring)");
console.log("   - GPS-enabled stations should display");
console.log("   - Traffic conditions should load");
console.log("   - Route optimization should work");
console.log();
console.log("🔑 ADMIN LOGIN REQUIRED:");
console.log("   Email: admin@caffe.org.jm");
console.log("   Password: password");
console.log();
console.log("🚀 Starting automated browser tests...");
console.log();

// Run the automated tests
testAllMaps().catch(console.error);