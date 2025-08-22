/**
 * Console Test Script for VIS API Requests
 * 
 * Copy and paste this entire script into your browser console to test
 * the VIS API requests for GetEvent, GetEventOfficialList, and GetEventRefereeList
 * 
 * Usage:
 * 1. Open your browser developer tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

// Console Test Script for VIS API
(async function testVisApiInConsole() {
  console.log('🎯 VIS API Console Test Script');
  console.log('=' .repeat(50));
  
  // Test configuration
  const eventNo = '1601'; // Your specified event number
  const baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  console.log(`📋 Testing Event No: ${eventNo}`);
  console.log(`🌐 API Base URL: ${baseUrl}`);
  console.log('');
  
  // Function to make VIS API request
  async function makeVisRequest(eventNumber) {
    console.log(`🔍 Making GetEvent request for event ${eventNumber}...`);
    
    try {
      // Construct the request URL
      const url = `${baseUrl}/GetEvent`;
      
      // Create the XML request body
      const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/">
  <soap:Body>
    <GetEvent xmlns="http://www.fivb.org/vis/2009/">
      <request>
        <Request Type="GetEvent" No="${eventNumber}" 
                 Fields="No Code Name CountryCode Status Type AuxiliaryPersons HasVolleyTournament HasBeachTournament TournamentName"
                 IncludeOfficials="true" 
                 IncludeReferees="true" />
      </request>
    </GetEvent>
  </soap:Body>
</soap:Envelope>`;

      console.log('📤 Sending XML Request:');
      console.log(xmlRequest);
      console.log('');
      
      // Make the HTTP request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.fivb.org/vis/2009/GetEvent'
        },
        body: xmlRequest
      });
      
      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the response text
      const responseText = await response.text();
      console.log('📥 Raw Response:');
      console.log(responseText);
      console.log('');
      
      // Parse the response
      parseVisResponse(responseText, eventNumber);
      
    } catch (error) {
      console.error('❌ Error making VIS API request:', error);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('- Check if you have internet connection');
      console.log('- Verify the VIS API is accessible');
      console.log('- Check CORS policy (may need to run from app context)');
      console.log('- Verify event number exists in VIS system');
    }
  }
  
  // Function to parse the VIS API response
  function parseVisResponse(xmlResponse, eventNumber) {
    console.log('🔍 Parsing VIS API Response...');
    console.log('');
    
    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        console.error('❌ XML Parsing Error:', parseError[0].textContent);
        return;
      }
      
      // Parse Event data
      console.log('📋 PARSING EVENT DATA:');
      const eventElements = xmlDoc.getElementsByTagName('Event');
      if (eventElements.length > 0) {
        const event = eventElements[0];
        console.log('✅ Event found:');
        console.log(`  - No: ${event.getAttribute('No') || 'N/A'}`);
        console.log(`  - Code: ${event.getAttribute('Code') || 'N/A'}`);
        console.log(`  - Name: ${event.getAttribute('Name') || 'N/A'}`);
        console.log(`  - CountryCode: ${event.getAttribute('CountryCode') || 'N/A'}`);
        console.log(`  - Status: ${event.getAttribute('Status') || 'N/A'}`);
        console.log(`  - Type: ${event.getAttribute('Type') || 'N/A'}`);
        console.log(`  - HasVolleyTournament: ${event.getAttribute('HasVolleyTournament') || 'N/A'}`);
        console.log(`  - HasBeachTournament: ${event.getAttribute('HasBeachTournament') || 'N/A'}`);
        console.log(`  - TournamentName: ${event.getAttribute('TournamentName') || 'N/A'}`);
      } else {
        console.log('❌ No Event element found');
      }
      console.log('');
      
      // Parse EventOfficialList data
      console.log('👨‍⚖️ PARSING EVENT OFFICIAL LIST:');
      const officialElements = xmlDoc.getElementsByTagName('EventOfficial');
      if (officialElements.length > 0) {
        console.log(`✅ Found ${officialElements.length} officials:`);
        
        for (let i = 0; i < officialElements.length; i++) {
          const official = officialElements[i];
          console.log(`\n  Official ${i + 1}:`);
          console.log(`    - FederationCode: ${official.getAttribute('FederationCode') || 'N/A'}`);
          console.log(`    - FirstName: ${official.getAttribute('FirstName') || 'N/A'}`);
          console.log(`    - Gender: ${official.getAttribute('Gender') || 'N/A'}`);
          console.log(`    - LastName: ${official.getAttribute('LastName') || 'N/A'}`);
          console.log(`    - NoPortraitPhoto: ${official.getAttribute('NoPortraitPhoto') || 'N/A'}`);
          console.log(`    - NoOfficial: ${official.getAttribute('NoOfficial') || 'N/A'}`);
          console.log(`    - Role: ${official.getAttribute('Role') || 'N/A'}`);
          console.log(`    - Signatures: ${official.getAttribute('Signatures') || 'N/A'}`);
          console.log(`    - Status: ${official.getAttribute('Status') || 'N/A'}`);
          console.log(`    - Type: ${official.getAttribute('Type') || 'N/A'}`);
        }
      } else {
        console.log('❌ No EventOfficial elements found');
      }
      console.log('');
      
      // Parse EventRefereeList data
      console.log('🏐 PARSING EVENT REFEREE LIST:');
      const refereeElements = xmlDoc.getElementsByTagName('EventReferee');
      if (refereeElements.length > 0) {
        console.log(`✅ Found ${refereeElements.length} referees:`);
        
        for (let i = 0; i < refereeElements.length; i++) {
          const referee = refereeElements[i];
          console.log(`\n  Referee ${i + 1}:`);
          console.log(`    - Conclusion: ${referee.getAttribute('Conclusion') || 'N/A'}`);
          console.log(`    - FederationCode: ${referee.getAttribute('FederationCode') || 'N/A'}`);
          console.log(`    - FirstName: ${referee.getAttribute('FirstName') || 'N/A'}`);
          console.log(`    - Gender: ${referee.getAttribute('Gender') || 'N/A'}`);
          console.log(`    - LastName: ${referee.getAttribute('LastName') || 'N/A'}`);
          console.log(`    - NoPortraitPhoto: ${referee.getAttribute('NoPortraitPhoto') || 'N/A'}`);
          console.log(`    - NoReferee: ${referee.getAttribute('NoReferee') || 'N/A'}`);
          console.log(`    - Signatures: ${referee.getAttribute('Signatures') || 'N/A'}`);
          console.log(`    - Status: ${referee.getAttribute('Status') || 'N/A'}`);
          console.log(`    - StrongPoints: ${referee.getAttribute('StrongPoints') || 'N/A'}`);
          console.log(`    - TheoryTest: ${referee.getAttribute('TheoryTest') || 'N/A'}`);
          console.log(`    - Type: ${referee.getAttribute('Type') || 'N/A'}`);
          console.log(`    - WeakPoints: ${referee.getAttribute('WeakPoints') || 'N/A'}`);
        }
      } else {
        console.log('❌ No EventReferee elements found');
      }
      console.log('');
      
      // Summary
      console.log('📊 SUMMARY:');
      console.log(`  - Event: ${eventElements.length > 0 ? '✅ Found' : '❌ Not found'}`);
      console.log(`  - Officials: ${officialElements.length} found`);
      console.log(`  - Referees: ${refereeElements.length} found`);
      
    } catch (error) {
      console.error('❌ Error parsing XML response:', error);
    }
  }
  
  // Alternative function to test with different event numbers
  window.testVisEvent = function(eventNumber = '1601') {
    console.log(`\n🔄 Testing with Event No: ${eventNumber}`);
    makeVisRequest(eventNumber);
  };
  
  // Function to show original request format
  window.showOriginalRequest = function() {
    console.log('📋 YOUR ORIGINAL REQUEST FORMAT:');
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
  };
  
  // Show available helper functions
  console.log('🛠️ HELPER FUNCTIONS AVAILABLE:');
  console.log('- testVisEvent("1601")     - Test with specific event number');
  console.log('- showOriginalRequest()    - Show your original request format');
  console.log('');
  
  // Run the initial test
  console.log('🚀 Running initial test...');
  await makeVisRequest(eventNo);
  
  console.log('');
  console.log('=' .repeat(50));
  console.log('✨ Console test completed!');
  console.log('💡 Try: testVisEvent("YOUR_EVENT_NUMBER") to test other events');
  
})().catch(error => {
  console.error('💥 Script execution failed:', error);
});

// Additional utility functions
console.log('📌 VIS API Console Test Script Loaded');
console.log('Copy this entire script and paste it in your browser console to run tests.');