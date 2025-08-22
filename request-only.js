// Copy this into your browser console or Postman

// Event number to test
const eventNo = '1601';

// The exact SOAP request
const request = `<?xml version="1.0" encoding="utf-8"?>
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

console.log('URL: https://www.fivb.org/Vis2009/XmlRequest.asmx/GetEvent');
console.log('Method: POST');
console.log('Content-Type: text/xml; charset=utf-8');
console.log('SOAPAction: http://www.fivb.org/vis/2009/GetEvent');
console.log('');
console.log('Request Body:');
console.log(request);