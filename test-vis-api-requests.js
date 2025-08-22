/**
 * Test script for VIS API requests - GetEvent, GetEventOfficialList, GetEventRefereeList
 * 
 * This script demonstrates the exact requests mentioned:
 * 1. GetEvent with No="1601" 
 * 2. GetEventOfficialList with Filter NoEvent="1601"
 * 3. GetEventRefereeList with Filter NoEvent="1601"
 */

// Import the VIS API client
const { VisApiClient } = require('./services/api/VisApiClient');
const { DEFAULT_RETRY_CONFIG } = require('./types/api-v2');

// Configuration for VIS API
const config = {
  baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
  enableLogging: true,
  headers: {}
};

async function testVisApiRequests() {
  console.log('🚀 Starting VIS API Request Tests');
  console.log('=' .repeat(50));
  
  const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
  const eventNo = '1601'; // Your specified event number
  
  try {
    // Request 1: GetEvent
    console.log(`\n📋 REQUEST 1: GetEvent`);
    console.log(`Event No: ${eventNo}`);
    console.log(`Fields: No Code Name CountryCode Status Type AuxiliaryPersons HasVolleyTournament HasBeachTournament TournamentName`);
    console.log('-'.repeat(40));
    
    const eventResponse = await visApi.getEvent({
      eventNo: eventNo,
      includeOfficials: true,  // This will include GetEventOfficialList
      includeReferees: true    // This will include GetEventRefereeList
    });
    
    if (eventResponse.success && eventResponse.xmlData) {
      console.log('✅ GetEvent Response received');
      console.log('📄 Raw XML Response:');
      console.log(eventResponse.xmlData);
      
      // Parse Event details
      console.log('\n🏐 PARSED EVENT DATA:');
      const eventMatch = eventResponse.xmlData.match(/<Event[^>]*>/);
      if (eventMatch) {
        const eventAttributes = eventMatch[0];
        console.log('Event attributes:', eventAttributes);
        
        // Extract specific fields
        const extractAttribute = (attr) => {
          const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
          const match = eventAttributes.match(regex);
          return match ? match[1] : 'N/A';
        };
        
        console.log(`- No: ${extractAttribute('No')}`);
        console.log(`- Code: ${extractAttribute('Code')}`);
        console.log(`- Name: ${extractAttribute('Name')}`);
        console.log(`- CountryCode: ${extractAttribute('CountryCode')}`);
        console.log(`- Status: ${extractAttribute('Status')}`);
        console.log(`- Type: ${extractAttribute('Type')}`);
        console.log(`- HasVolleyTournament: ${extractAttribute('HasVolleyTournament')}`);
        console.log(`- HasBeachTournament: ${extractAttribute('HasBeachTournament')}`);
        console.log(`- TournamentName: ${extractAttribute('TournamentName')}`);
      }
      
      // Request 2: Parse GetEventOfficialList (included in the response)
      console.log('\n👨‍⚖️ REQUEST 2: GetEventOfficialList');
      console.log(`Filter: NoEvent="${eventNo}"`);
      console.log(`Fields: FederationCode FirstName Gender LastName NoPortraitPhoto NoOfficial Role Signatures Status Type`);
      console.log('-'.repeat(40));
      
      const officialListMatch = eventResponse.xmlData.match(/<EventOfficialList[^>]*>(.*?)<\/EventOfficialList>/s);
      if (officialListMatch) {
        console.log('✅ EventOfficialList found in response');
        const officialListXml = officialListMatch[1];
        const officialMatches = officialListXml.match(/<EventOfficial[^>]*\/>/g) || [];
        
        console.log(`📊 Found ${officialMatches.length} officials:`);
        
        officialMatches.forEach((match, index) => {
          const parseAttribute = (attr) => {
            const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
            const result = match.match(regex);
            return result ? result[1] : '';
          };
          
          console.log(`\nOfficial ${index + 1}:`);
          console.log(`  - FederationCode: ${parseAttribute('FederationCode')}`);
          console.log(`  - FirstName: ${parseAttribute('FirstName')}`);
          console.log(`  - Gender: ${parseAttribute('Gender')}`);
          console.log(`  - LastName: ${parseAttribute('LastName')}`);
          console.log(`  - NoPortraitPhoto: ${parseAttribute('NoPortraitPhoto')}`);
          console.log(`  - NoOfficial: ${parseAttribute('NoOfficial')}`);
          console.log(`  - Role: ${parseAttribute('Role')}`);
          console.log(`  - Signatures: ${parseAttribute('Signatures')}`);
          console.log(`  - Status: ${parseAttribute('Status')}`);
          console.log(`  - Type: ${parseAttribute('Type')}`);
        });
      } else {
        console.log('❌ No EventOfficialList found in response');
      }
      
      // Request 3: Parse GetEventRefereeList (included in the response)
      console.log('\n🏐 REQUEST 3: GetEventRefereeList');
      console.log(`Filter: NoEvent="${eventNo}"`);
      console.log(`Fields: Conclusion FederationCode FirstName Gender LastName NoPortraitPhoto NoReferee Signatures Status StrongPoints TheoryTest Type WeakPoints`);
      console.log('-'.repeat(40));
      
      const refereeListMatch = eventResponse.xmlData.match(/<EventRefereeList[^>]*>(.*?)<\/EventRefereeList>/s);
      if (refereeListMatch) {
        console.log('✅ EventRefereeList found in response');
        const refereeListXml = refereeListMatch[1];
        const refereeMatches = refereeListXml.match(/<EventReferee[^>]*\/>/g) || [];
        
        console.log(`📊 Found ${refereeMatches.length} referees:`);
        
        refereeMatches.forEach((match, index) => {
          const parseAttribute = (attr) => {
            const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
            const result = match.match(regex);
            return result ? result[1] : '';
          };
          
          console.log(`\nReferee ${index + 1}:`);
          console.log(`  - Conclusion: ${parseAttribute('Conclusion')}`);
          console.log(`  - FederationCode: ${parseAttribute('FederationCode')}`);
          console.log(`  - FirstName: ${parseAttribute('FirstName')}`);
          console.log(`  - Gender: ${parseAttribute('Gender')}`);
          console.log(`  - LastName: ${parseAttribute('LastName')}`);
          console.log(`  - NoPortraitPhoto: ${parseAttribute('NoPortraitPhoto')}`);
          console.log(`  - NoReferee: ${parseAttribute('NoReferee')}`);
          console.log(`  - Signatures: ${parseAttribute('Signatures')}`);
          console.log(`  - Status: ${parseAttribute('Status')}`);
          console.log(`  - StrongPoints: ${parseAttribute('StrongPoints')}`);
          console.log(`  - TheoryTest: ${parseAttribute('TheoryTest')}`);
          console.log(`  - Type: ${parseAttribute('Type')}`);
          console.log(`  - WeakPoints: ${parseAttribute('WeakPoints')}`);
        });
      } else {
        console.log('❌ No EventRefereeList found in response');
      }
      
    } else {
      console.error('❌ Failed to get event data:', eventResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Error during API requests:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 VIS API Request Tests Completed');
}

// Alternative function to make individual requests (if needed)
async function testIndividualRequests() {
  console.log('\n🔄 Alternative: Making individual requests');
  console.log('=' .repeat(50));
  
  const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
  const eventNo = '1601';
  
  try {
    // Individual GetEvent request
    console.log('\n📋 Individual GetEvent request:');
    const eventResponse = await visApi.getEvent({
      eventNo: eventNo,
      includeOfficials: false,
      includeReferees: false
    });
    
    if (eventResponse.success) {
      console.log('✅ GetEvent successful');
      console.log('Raw response:', eventResponse.xmlData);
    }
    
    // Individual GetEventOfficialList request (if API supports it separately)
    console.log('\n👨‍⚖️ Note: GetEventOfficialList is typically included in GetEvent response when includeOfficials=true');
    
    // Individual GetEventRefereeList request (if API supports it separately)  
    console.log('\n🏐 Note: GetEventRefereeList is typically included in GetEvent response when includeReferees=true');
    
  } catch (error) {
    console.error('❌ Error during individual requests:', error);
  }
}

// Export functions for use in other modules
module.exports = {
  testVisApiRequests,
  testIndividualRequests
};

// Run the test if this script is executed directly
if (require.main === module) {
  console.log('🎯 VIS API Request Test Script');
  console.log('Testing the exact requests from your specification:');
  console.log('');
  console.log('<Requests>');
  console.log('  <Request Type="GetEvent" No="1601" Fields="No Code Name CountryCode Status Type AuxiliaryPersons HasVolleyTournament HasBeachTournament TournamentName"/>');
  console.log('  <Request Type="GetEventOfficialList" Fields="FederationCode FirstName Gender LastName NoPortraitPhoto NoOfficial Role Signatures Status Type">');
  console.log('    <Filter NoEvent="1601"/>');
  console.log('  </Request>');
  console.log('  <Request Type="GetEventRefereeList" Fields="Conclusion FederationCode FirstName Gender LastName NoPortraitPhoto NoReferee Signatures Status StrongPoints TheoryTest Type WeakPoints">');
  console.log('    <Filter NoEvent="1601"/>');
  console.log('  </Request>');
  console.log('</Requests>');
  console.log('');
  
  testVisApiRequests()
    .then(() => {
      console.log('\n✨ Script execution completed successfully');
    })
    .catch(error => {
      console.error('\n💥 Script execution failed:', error);
    });
}