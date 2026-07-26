const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbxj_KsFJ89lpmxYQLlxnoZ9NoFeVMy_9gnIC0vDFImonUllNygnYZ7tNTyG0C0FBxDvWA/exec';

async function gasGet(params) {
  const url = GAS_API_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('GAS returned non-JSON: ' + text.substring(0, 200)); }
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      const data = await gasPost({ action: 'updateRootFolderUrl', urlOrId: body.urlOrId || '', userEmail: body.userEmail || '' });
      res.status(200).json(data);
    } else {
      const data = await gasGet({ action: 'getRootFolderInfo' });
      res.status(200).json(data);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
