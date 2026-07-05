import prisma from '@/utils/db';

const ALLOWED_ORIGINS = [
  'https://fusioncollegenarowal.vercel.app',
  'http://localhost:5173',
];

function getCorsHeaders(req) {
  const origin = req.headers.get('origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { name, email, phone, message } = body;

    if (!name || !phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Name, phone, and message are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name,
        email: email || null,
        phone,
        message,
        status: 'UNREAD',
      },
    });

    return new Response(JSON.stringify(enquiry), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Enquiry error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
