// Quick test: ping the gateway /status endpoint and try sending a test message
const GATEWAY_URL = 'https://fusion-whatsapp-gateway.onrender.com';
const TEST_PHONE = '03347763871';
const TEST_MESSAGE = '[DEBUG TEST] If you see this, WhatsApp gateway delivery is working.';

async function run() {
  // 1. Check status
  console.log('--- Gateway Status ---');
  try {
    const res = await fetch(`${GATEWAY_URL}/status`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Status check failed:', e.message);
  }

  // 2. Try sending a test message
  console.log('\n--- Sending Test Message ---');
  try {
    const res = await fetch(`${GATEWAY_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: TEST_PHONE, message: TEST_MESSAGE }),
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Send failed:', e.message);
  }
}

run();
