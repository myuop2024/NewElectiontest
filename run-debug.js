// Simple script to run the debugging
console.log('🚀 Starting Jamaica News Monitoring Debug...\n');

// Import and run the debug script
const { exec } = require('child_process');

console.log('Running comprehensive debug...\n');

exec('node debug-news-monitoring.js', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Debug script failed:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️  Debug warnings:', stderr);
  }
  
  console.log('📋 Debug Output:');
  console.log(stdout);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check the debug output above for any issues');
  console.log('2. If filtering tests fail, the filtering logic needs adjustment');
  console.log('3. If environment variables are missing, configure them');
  console.log('4. Start the server to see real-time filtering in action');
  console.log('5. Look for [NEWS FILTER], [SOCIAL FILTER], [X SENTIMENT] tags in console');
}); 