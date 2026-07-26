const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwto4enwrfI0N3a8xbZ_fEJASBvzhnjw_jhAZO-Yjj6n2B86MHNkBK9QO_lufP6uelwuA/exec';

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
      const data = await gasPost({ action: 'updateUserRole', targetEmail: req.body.targetEmail, newRole: req.body.newRole });
      res.status(200).json(data);
    } else {
      const data = await gasGet({ action: 'getUsersList' });
      res.status(200).json(Array.isArray(data) ? data : []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
