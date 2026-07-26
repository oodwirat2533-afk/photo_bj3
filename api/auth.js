const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwto4enwrfI0N3a8xbZ_fEJASBvzhnjw_jhAZO-Yjj6n2B86MHNkBK9QO_lufP6uelwuA/exec';

async function gasGet(params) {
  const url = GAS_API_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('GAS returned non-JSON: ' + text.substring(0, 200)); }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const userEmail = req.query.userEmail || '';
  try {
    const data = await gasGet({ action: 'getUserContext', userEmail });
    res.status(200).json(data);
  } catch (error) {
    if (userEmail) {
      const isOwner = userEmail.toLowerCase() === 'ood.wirat2533@gmail.com';
      res.status(200).json({
        email: userEmail,
        role: isOwner ? "SUPER_ADMIN" : "GUEST",
        isSuperAdmin: isOwner,
        isAdminOrHigher: isOwner,
        isCanUpload: isOwner,
        canCreateAlbum: isOwner,
        profileComplete: true
      });
    } else {
      res.status(200).json({
        email: "",
        role: "GUEST",
        isSuperAdmin: false,
        isAdminOrHigher: false,
        isCanUpload: false,
        canCreateAlbum: false,
        profileComplete: true
      });
    }
  }
};
