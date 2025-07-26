/**
 * Test Historical Data Generator - Direct Database Population
 */

import { ecjHistoricalDataGenerator } from './server/lib/ecj-historical-data-generator.js';

async function testHistoricalGenerator() {
  console.log('\n🏛️ Testing Jamaica Historical Election Data Generator...\n');
  
  try {
    console.log('📚 Generating comprehensive Jamaica election history (1962-2024)...');
    
    // Generate the historical elections
    const elections = await ecjHistoricalDataGenerator.generateHistoricalElections();
    
    console.log(`✅ Generated ${elections.length} historical elections`);
    
    // Show breakdown by type
    const generalElections = elections.filter(e => e.type === 'General Election');
    const parishElections = elections.filter(e => e.type === 'Parish Council');
    const byElections = elections.filter(e => e.type === 'By-Election');
    
    console.log(`   📊 General Elections: ${generalElections.length}`);
    console.log(`   🏛️ Parish Council Elections: ${parishElections.length}`);
    console.log(`   🗳️ By-Elections: ${byElections.length}`);
    
    // Show date range
    const years = elections.map(e => e.year).sort((a, b) => a - b);
    console.log(`   📅 Date range: ${years[0]} - ${years[years.length - 1]}`);
    
    // Show sample elections
    console.log('\n📋 Sample Historical Elections:');
    elections.slice(0, 5).forEach(election => {
      const avgTurnout = (election.parishes.reduce((sum, p) => sum + p.turnout, 0) / election.parishes.length * 100).toFixed(1);
      console.log(`   • ${election.year}: ${election.title} - ${avgTurnout}% avg turnout`);
    });
    
    console.log('\n💾 Now populating database...');
    await ecjHistoricalDataGenerator.populateHistoricalDatabase();
    
    console.log('✅ Historical database population completed!');
    
  } catch (error) {
    console.error('❌ Historical generation failed:', error);
  }
}

testHistoricalGenerator();