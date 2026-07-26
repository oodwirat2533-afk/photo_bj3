const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbxj_KsFJ89lpmxYQLlxnoZ9NoFeVMy_9gnIC0vDFImonUllNygnYZ7tNTyG0C0FBxDvWA/exec';

// Helper: safe fetch that handles GAS redirects and returns parsed JSON
async function gasGet(params) {
  const url = GAS_API_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('GAS returned non-JSON: ' + text.substring(0, 200));
  }
}

async function gasPost(body) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('GAS returned non-JSON: ' + text.substring(0, 200));
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'POST') {
      const { action = 'createFolder', folderName = '', userEmail = '', albumId = '', isHidden = false } = req.body || {};
      if (action === 'toggleVisibility') {
        const data = await gasPost({ action: 'toggleAlbumVisibility', albumId, isHidden, userEmail });
        res.status(200).json(data);
      } else {
        const data = await gasPost({ action: 'createFolder', folderName, userEmail });
        res.status(200).json(data);
      }
    } else {
      const data = await gasGet({ action: 'getFolders' });
      // Ensure always Array
      res.status(200).json(Array.isArray(data) ? data : []);
    }
  } catch (error) {
    res.status(200).json({ error: error.message });
  }
};
