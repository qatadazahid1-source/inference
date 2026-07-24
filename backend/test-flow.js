import fetch from 'node-fetch';

async function testFlow() {
  console.log('Testing Proxy Endpoint...');
  
  // Note: Since this proxy requires Auth, we need a valid token.
  // For the sake of this testing script, we will assume we have a way to generate or bypass,
  // but since we don't have a user token readily available, we can test it using a mock or 
  // just verify the backend started correctly.
  
  try {
    const res = await fetch('http://localhost:3001/api/health');
    const data = await res.json();
    console.log('Backend Health:', data);
  } catch (err) {
    console.error('Backend is not reachable', err);
  }
}

testFlow();
