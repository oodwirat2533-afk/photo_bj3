// Vercel Serverless API Route: /api/photos
const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwu4nT5mvLHNLtGEvohgoutIRlsSK7ZswAp8AY3gWKvP05qTvi-LbDRXk3iv63CBopTCQ/exec';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { folderId, offset = 0, limit = 24, search = '' } = req.query;

  try {
    const targetUrl = `${GAS_API_URL}?action=getPhotos&folderId=${encodeURIComponent(folderId || 'root')}&offset=${offset}&limit=${limit}&search=${encodeURIComponent(search)}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(200).json({
      type: 'photos',
      items: [],
      total: 0,
      hasMore: false
    });
  }
};
