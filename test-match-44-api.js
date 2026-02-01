/**
 * Test script to fetch match 44 (Hamburg Women's Final) from VIS API
 */

// VIS API configuration
const VIS_API_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

// Build the XML request for GetBeachMatch
const buildGetBeachMatchRequest = (matchNo, tournamentNo, fields) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatch" No="${matchNo}" NoTournament="${tournamentNo}" Fields="${fields}" />`;
};

// Make the API request
async function fetchMatch44() {
  console.log('🏐 Fetching Match 44 - Hamburg Women\'s Final\n');

  const matchNo = '44';
  const tournamentNo = '1552'; // Hamburg Elite 16 2025
  const fields = 'NoReferee1 NoReferee2 Personnel NoTeamA NoTeamB';
  const xmlRequest = buildGetBeachMatchRequest(matchNo, tournamentNo, fields);

  console.log('📤 Request XML:');
  console.log(xmlRequest);
  console.log('\n');

  try {
    // VIS API expects form data with Request parameter
    const formData = `Request=${encodeURIComponent(xmlRequest)}`;

    const response = await fetch(VIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();

    console.log('📥 Response:');
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    // Try to extract specific fields
    console.log('\n📊 Extracted Fields:');
    console.log('='.repeat(80));

    const extractField = (xml, fieldName) => {
      const regex = new RegExp(`<${fieldName}>([^<]*)</${fieldName}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : 'Not found';
    };

    console.log('NoReferee1:', extractField(responseText, 'NoReferee1'));
    console.log('NoReferee2:', extractField(responseText, 'NoReferee2'));
    console.log('NoTeamA:', extractField(responseText, 'NoTeamA'));
    console.log('NoTeamB:', extractField(responseText, 'NoTeamB'));

    // Extract Personnel section
    const personnelMatch = responseText.match(/<Personnel>([\s\S]*?)<\/Personnel>/i);
    if (personnelMatch) {
      console.log('\nPersonnel Section:');
      console.log(personnelMatch[1]);
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Run the test
fetchMatch44();
