export async function GET() { return new Response(JSON.stringify({ tasks: [], message: 'Test endpoint' }), { headers: { 'Content-Type': 'application/json' } }); }
