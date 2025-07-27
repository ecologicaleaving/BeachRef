#!/usr/bin/env node

// Test VIS API with authentication
const https = require('https');
const querystring = require('querystring');

const username = 'dadecresce@gmail.com';
const password = 'Leyla2011';

console.log('🔐 Testing VIS API with Authentication\n');

// Test 1: Basic Authentication with Tournament Details
async function testWithBasicAuth() {
  console.log('📋 Test 1: Basic Authentication - Get Tournament Details\n');
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const requestParam = encodeURIComponent('<Request Type="GetTournament" No="1" />');
  
  const options = {
    hostname: 'www.fivb.org',
    path: `/Vis2009/XmlRequest.asmx?Request=${requestParam}`,
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'VisConnect-TestClient/1.0'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Response length: ${data.length} chars`);
        console.log(`   Response preview: ${data.substring(0, 500)}...`);
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

// Test 2: XML-embedded Authentication with Multiple Requests
async function testWithXMLAuth() {
  console.log('\n📋 Test 2: XML Authentication - Multiple Requests\n');
  
  const requestXML = `<Requests Username="${username}" Password="${password}">
    <Request Type="GetTournament" No="1" />
    <Request Type="GetPlayerList" />
    <Request Type="GetMatchList" Recent="1" />
  </Requests>`;
  
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
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Response length: ${data.length} chars`);
        console.log(`   Response preview: ${data.substring(0, 500)}...`);
        
        // Check for authentication success indicators
        if (data.includes('<Tournament') && data.includes('Name=')) {
          console.log(`   ✅ SUCCESS: Got detailed tournament data!`);
        } else if (data.includes('Error') || data.includes('401')) {
          console.log(`   ❌ FAILED: Authentication error`);
        } else {
          console.log(`   ⚠️  UNCLEAR: Check response manually`);
        }
        
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 3: Check User Authentication Status
async function testUserCheck() {
  console.log('\n📋 Test 3: Check User Authentication\n');
  
  const requestXML = `<Request Type="CheckUser" Username="${username}" Password="${password}" />`;
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
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Response: ${data}`);
        
        if (data.includes('OK') || data.includes('Valid')) {
          console.log(`   ✅ User credentials are valid!`);
        } else {
          console.log(`   ❌ User credentials invalid or restricted`);
        }
        
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 4: Try JSON Response Format
async function testJSONFormat() {
  console.log('\n📋 Test 4: JSON Response Format\n');
  
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
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Response length: ${data.length} chars`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`   ✅ Valid JSON response received!`);
          console.log(`   JSON keys: ${Object.keys(jsonData)}`);
        } catch (e) {
          console.log(`   ⚠️  Response is not JSON: ${data.substring(0, 200)}...`);
        }
        
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

// Run all tests
async function runAllTests() {
  try {
    await testWithBasicAuth();
    await testWithXMLAuth();
    await testUserCheck();
    await testJSONFormat();
    
    console.log('\n🎯 Authentication Testing Complete!');
    console.log('\nNext steps:');
    console.log('- If successful: Document working endpoints for VisConnect');
    console.log('- If failed: Use public endpoints + mock data for MVP');
    console.log('- Contact FIVB for official API access: vis.sdk@fivb.org');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
}

// Execute tests
runAllTests();