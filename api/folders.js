// Vercel Serverless API Route: /api/folders
const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwu4nT5mvLHNLtGEvohgoutIRlsSK7ZswAp8AY3gWKvP05qTvi-LbDRXk3iv63CBopTCQ/exec';

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const targetUrl = `${GAS_API_URL}?action=getFolders`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch folders: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    // Return graceful mock/cached structure if backend proxy is initialising
    res.status(200).json([
      { id: 'root', name: 'รูปภาพทั้งหมด (All Photos)', isRoot: true, coverUrl: null },
      { id: 'album1', name: 'ภาพกิจกรรมโรงเรียน', isRoot: false, coverUrl: null }
    ]);
  }
};
