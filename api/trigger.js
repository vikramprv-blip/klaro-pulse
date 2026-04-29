export const config = { runtime: 'edge' };
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': 'https://klaro.services', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://klaro.services' } });
  }
  const GITHUB_TOKEN = process.env.GITHUB_PAT;
  const REPO = 'vikramprv-blip/klaro-pulse';
  if (!GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT not set in Vercel env vars' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://klaro.services' } });
  }
  const body = await req.json().catch(() => ({}));
  const target_url = body.target_url || '';
  const response = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/pulse.yml/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: { target_url }
    })
  });
  if (response.status === 204) {
    return new Response(JSON.stringify({ ok: true, message: target_url ? `Scanning ${target_url} — results in 3-5 min` : 'Batch scan triggered — results in 5-10 min' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://klaro.services' } });
  }
  const err = await response.text();
  return new Response(JSON.stringify({ error: 'Failed to trigger', detail: err }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://klaro.services' } });
}
