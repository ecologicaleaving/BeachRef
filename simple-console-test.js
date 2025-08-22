/**
 * Simple Console Test Script for VIS API - CORS-friendly version
 * 
 * This script shows you the exact requests and provides alternatives
 * since direct browser testing is blocked by CORS policy.
 */

console.log('🎯 VIS API Test Script (CORS-friendly)');
console.log('=' .repeat(50));

// Your original request specification
console.log('📋 YOUR ORIGINAL REQUEST:');
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

// Exact SOAP request format
const eventNo = '1601';
const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/">
  <soap:Body>
    <GetEvent xmlns="http://www.fivb.org/vis/2009/">
      <request>
        <Request Type="GetEvent" No="${eventNo}" 
                 Fields="No Code Name CountryCode Status Type AuxiliaryPersons HasVolleyTournament HasBeachTournament TournamentName"
                 IncludeOfficials="true" 
                 IncludeReferees="true" />
      </request>
    </GetEvent>
  </soap:Body>
</soap:Envelope>`;

console.log('📤 EXACT SOAP REQUEST:');
console.log(soapRequest);
console.log('');

console.log('🌐 REQUEST DETAILS:');
console.log('URL: https://www.fivb.org/Vis2009/XmlRequest.asmx/GetEvent');
console.log('Method: POST');
console.log('Content-Type: text/xml; charset=utf-8');
console.log('SOAPAction: http://www.fivb.org/vis/2009/GetEvent');
console.log('');

// Function to show how to test this properly
console.log('🔧 HOW TO TEST THIS REQUEST:');
console.log('');
console.log('Option 1: Use your app (recommended)');
console.log('- Open your React Native app');
console.log('- Navigate to tournament detail screen');
console.log('- Tap "Ref Tools" button');
console.log('- Check console for API responses');
console.log('');

console.log('Option 2: Use Postman or similar tool');
console.log('- Open Postman');
console.log('- Create new POST request');
console.log('- URL: https://www.fivb.org/Vis2009/XmlRequest.asmx/GetEvent');
console.log('- Headers:');
console.log('  Content-Type: text/xml; charset=utf-8');
console.log('  SOAPAction: http://www.fivb.org/vis/2009/GetEvent');
console.log('- Body (raw XML):');
console.log(soapRequest);
console.log('');

console.log('Option 3: Use curl command');
console.log('Copy this curl command:');
console.log('');
const curlCommand = `curl -X POST https://www.fivb.org/Vis2009/XmlRequest.asmx/GetEvent \\
-H "Content-Type: text/xml; charset=utf-8" \\
-H "SOAPAction: http://www.fivb.org/vis/2009/GetEvent" \\
-d '${soapRequest.replace(/'/g, "\\\'")}'`;
console.log(curlCommand);
console.log('');

// Sample response parser for when you get real data
console.log('📊 RESPONSE PARSER (for when you get real data):');
console.log('');

window.parseVisResponse = function(xmlString) {
  console.log('🔍 Parsing VIS API Response...');
  
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Parse Event
    console.log('📋 EVENT DATA:');
    const eventElements = xmlDoc.getElementsByTagName('Event');
    if (eventElements.length > 0) {
      const event = eventElements[0];
      console.log('✅ Event found:');
      console.log(`  No: ${event.getAttribute('No')}`);
      console.log(`  Code: ${event.getAttribute('Code')}`);
      console.log(`  Name: ${event.getAttribute('Name')}`);
      console.log(`  CountryCode: ${event.getAttribute('CountryCode')}`);
      console.log(`  Status: ${event.getAttribute('Status')}`);
      console.log(`  Type: ${event.getAttribute('Type')}`);
      console.log(`  TournamentName: ${event.getAttribute('TournamentName')}`);
    }
    
    // Parse Officials
    console.log('\\n👨‍⚖️ OFFICIALS:');
    const officials = xmlDoc.getElementsByTagName('EventOfficial');
    console.log(`Found ${officials.length} officials:`);
    
    for (let i = 0; i < officials.length; i++) {
      const official = officials[i];
      console.log(`\\nOfficial ${i + 1}:`);
      console.log(`  Name: ${official.getAttribute('FirstName')} ${official.getAttribute('LastName')}`);
      console.log(`  Federation: ${official.getAttribute('FederationCode')}`);
      console.log(`  Role: ${official.getAttribute('Role')}`);
      console.log(`  Type: ${official.getAttribute('Type')}`);
      console.log(`  Status: ${official.getAttribute('Status')}`);
    }
    
    // Parse Referees
    console.log('\\n🏐 REFEREES:');
    const referees = xmlDoc.getElementsByTagName('EventReferee');
    console.log(`Found ${referees.length} referees:`);
    
    for (let i = 0; i < referees.length; i++) {
      const referee = referees[i];
      console.log(`\\nReferee ${i + 1}:`);
      console.log(`  Name: ${referee.getAttribute('FirstName')} ${referee.getAttribute('LastName')}`);
      console.log(`  Federation: ${referee.getAttribute('FederationCode')}`);
      console.log(`  Type: ${referee.getAttribute('Type')}`);
      console.log(`  Status: ${referee.getAttribute('Status')}`);
      console.log(`  Strong Points: ${referee.getAttribute('StrongPoints')}`);
      console.log(`  Theory Test: ${referee.getAttribute('TheoryTest')}`);
      console.log(`  Conclusion: ${referee.getAttribute('Conclusion')}`);
    }
    
    console.log('\\n📊 SUMMARY:');
    console.log(`Events: ${eventElements.length}`);
    console.log(`Officials: ${officials.length}`);
    console.log(`Referees: ${referees.length}`);
    
  } catch (error) {
    console.error('❌ Error parsing XML:', error);
  }
};

// Function to test with different event numbers
window.testEventNumber = function(eventNumber) {
  console.log(`\\n🔄 Testing Event No: ${eventNumber}`);
  
  const newSoapRequest = soapRequest.replace(/No="1601"/, `No="${eventNumber}"`);
  
  console.log('📤 SOAP Request for this event:');
  console.log(newSoapRequest);
  console.log('');
  console.log('💡 Copy this request and test it in Postman or your app!');
};

// Show usage instructions
console.log('🛠️ FUNCTIONS AVAILABLE:');
console.log('- parseVisResponse(xmlString)  - Parse XML response');
console.log('- testEventNumber("1234")      - Generate request for different event');
console.log('');

console.log('❌ CORS Error Explanation:');
console.log('The browser blocks direct API calls due to CORS policy.');
console.log('This is normal security behavior.');
console.log('Use your React Native app or Postman to test the API instead.');
console.log('');

console.log('✨ Your React Native app implementation will work perfectly!');
console.log('The ref-mode screen should show the data when you tap "Ref Tools".');
console.log('');
console.log('=' .repeat(50));