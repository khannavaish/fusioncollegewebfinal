// Raw response inspection - don't parse as JSON, read raw text
const GATEWAY_URL = 'https://fusion-whatsapp-gateway.onrender.com';
const TEST_PHONE = '03347763871';
const TEST_MESSAGE = '[DEBUG TEST 2] Raw inspection test.';

async function run() {
  // 1. Check /status raw
  console.log('--- /status raw ---');
  try {
    const res = await fetch(`${GATEWAY_URL}/status`);
    const text = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Body (first 200 chars):', text.substring(0, 200));
  } catch (e) {
    console.error('Status check failed:', e.message);
  }

  // 2. Check /send raw
  console.log('\n--- /send raw ---');
  try {
    const res = await fetch(`${GATEWAY_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: TEST_PHONE, message: TEST_MESSAGE }),
    });
    const text = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Body (first 300 chars):', text.substring(0, 300));
  } catch (e) {
    console.error('Send failed:', e.message);
  }
}

run();
