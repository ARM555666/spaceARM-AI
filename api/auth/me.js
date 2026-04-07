export default function handler(req, res) {
  const token = req.headers['x-auth-token'];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  res.status(200).json({
    id: 1,
    username: 'User',
    role: 'user'
  });
}