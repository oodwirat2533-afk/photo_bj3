// Vercel Serverless API Route: /api/upload
const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbz-q4Es0YxmLPNyVT-N-ztnjVO-5yRq5S2jU3TgCY1djdSFKr6BmzajB_i-dMMiuvs6Xw/exec';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { folderId, filePayloads } = req.body || {};
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadPhotos', folderId, filePayloads })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
};
