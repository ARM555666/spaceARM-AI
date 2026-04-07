export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });
  }

  res.status(200).json({
    token: 'mock-token-123',
    user: {
      username,
      role: 'user'
    }
  });
}