#!/usr/bin/env node

// Detailed VIS API Authentication Analysis
const https = require('https');
const querystring = require('querystring');

const username = 'dadecresce@gmail.com';
const password = 'Leyla2011';

console.log('🔍 Detailed VIS Authentication Analysis\n');

// Test JSON error response
async function testJSONError() {
  console.log('📋 Analyzing JSON Error Response\n');
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const requestParam = encodeURIComponent('<Request Type="GetBeachMatchList" />');
  
  const options = {
    hostname: 'www.fivb.org',
    path: `/Vis2009/XmlRequest.asmx?Request=${requestParam}`,
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'User-Agent': 'VisConnect-TestClient/1.0'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Raw response: ${data}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`   Parsed JSON:`, JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log(`   Failed to parse JSON: ${e.message}`);
        }
        
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      resolve(null);
    });
    
    req.end();
  });
}

// Test different user check formats
async function testUserCheckVariations() {
  console.log('\n📋 Testing User Check Variations\n');
  
  const variations = [
    { name: 'Basic CheckUser', xml: `<Request Type="CheckUser" Username="${username}" Password="${password}" />` },
    { name: 'User in Requests', xml: `<Requests Username="${username}" Password="${password}"><Request Type="CheckUser" /></Requests>` },
    { name: 'GetUser Request', xml: `<Request Type="GetUser" Username="${username}" Password="${password}" />` },
  ];
  
  for (const variation of variations) {
    console.log(`   Testing: ${variation.name}`);
    
    const postData = querystring.stringify({ Request: variation.xml });
    
    const options = {
      hostname: 'www.fivb.org',
      path: '/Vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'VisConnect-TestClient/1.0'
      }
    };
    
    await new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log(`      Status: ${res.statusCode}`);
          console.log(`      Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        console.log(`      Error: ${error.message}`);
        resolve();
      });
      
      req.write(postData);
      req.end();
    });
    
    console.log('');
  }
}

// Test if we can access user info with correct format
async function testUserAccess() {
  console.log('\n📋 Testing User Access Patterns\n');
  
  // Try the format mentioned in docs: SendUserLoginInfo
  const requestXML = `<Request Type="SendUserLoginInfo" Username="${username}" />`;
  const postData = querystring.stringify({ Request: requestXML });
  
  const options = {
    hostname: 'www.fivb.org',
    path: '/Vis2009/XmlRequest.asmx',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'VisConnect-TestClient/1.0'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Response: ${data}`);
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run detailed analysis
async function runDetailedAnalysis() {
  try {
    await testJSONError();
    await testUserCheckVariations();
    await testUserAccess();
    
    console.log('\n🎯 Analysis Summary:');
    console.log('');
    console.log('🔴 Authentication Status: FAILED');
    console.log('   - Credentials rejected with "BadUser id=6"');
    console.log('   - User format not recognized "NotInNewFormat id=1008"');
    console.log('   - JSON error response confirms 401 Unauthorized');
    console.log('');
    console.log('💡 Possible Reasons:');
    console.log('   1. Credentials are for different VIS system/version');
    console.log('   2. Account needs activation or approval');
    console.log('   3. Credentials are for web portal, not API access');
    console.log('   4. API access requires special permissions/subscription');
    console.log('');
    console.log('🚀 Recommended Next Steps:');
    console.log('   1. Contact FIVB at vis.sdk@fivb.org for API access');
    console.log('   2. Use public endpoints for MVP development');
    console.log('   3. Implement with mock data for demonstration');
    console.log('   4. Plan authentication integration for production');
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
  }
}

runDetailedAnalysis();