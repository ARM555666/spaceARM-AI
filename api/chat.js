export const config = { runtime: 'edge' };

export default async function handler(req) {
  // ✅ CORS (กัน error)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // ❌ method อื่นไม่ให้ใช้
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 🔐 API KEY
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า GROQ_API_KEY ใน Vercel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 📥 รับข้อมูล
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { messages = [], modelIndex = 0, systemPrompt = '' } = body;

  // 🤖 โมเดล
  const MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ];

  const primary = MODELS[modelIndex] ?? MODELS[0];
  const fallback = MODELS.find((_, i) => i !== modelIndex) ?? MODELS[1];

  // ⏱ ฟังก์ชันเรียก API + timeout
  async function fetchWithTimeout(model, timeout = 6000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            ...messages.map(m => ({
              role: m.role,
              content: String(m.content)
            })),
          ],
          stream: true,
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: controller.signal
      });

      clearTimeout(id);
      return res;

    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  let groqRes;

  try {
    // 🔥 เรียกตัวหลักก่อน (มี timeout)
    groqRes = await fetchWithTimeout(primary, 6000);

    // ถ้าโดน limit → fallback ทันที
    if (groqRes.status === 429) {
      console.warn(`⚠️ ${primary} limit → switching to ${fallback}`);
      groqRes = await fetchWithTimeout(fallback, 6000);
    }

  } catch (err) {
    console.warn(`⚠️ ${primary} fail → fallback`);
    try {
      groqRes = await fetchWithTimeout(fallback, 6000);
    } catch {
      return new Response(
        JSON.stringify({ error: 'All models failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ❌ ถ้ายัง error
  if (!groqRes || !groqRes.ok) {
    const errText = await groqRes.text();
    return new Response(errText, {
      status: groqRes.status,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 🚀 STREAM กลับไปหน้าเว็บ
  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}