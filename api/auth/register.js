export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, email, password } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username ต้องมากกว่า 3 ตัว' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password ต้องมากกว่า 6 ตัว' });
  }

  const user = {
    id: Date.now(),
    username,
    email: email || '',
    role: 'user'
  };

  res.status(200).json({
    token: 'mock-token-' + user.id,
    user
  });
}