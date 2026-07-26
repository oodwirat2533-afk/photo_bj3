const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwto4enwrfI0N3a8xbZ_fEJASBvzhnjw_jhAZO-Yjj6n2B86MHNkBK9QO_lufP6uelwuA/exec';

async function gasPost(body) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('GAS returned non-JSON: ' + text.substring(0, 200)); }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const { folderId, filePayloads } = req.body || {};
    const data = await gasPost({ action: 'uploadPhotos', folderId, filePayloads });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
