const db = require('./lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const userEmail = (req.query.userEmail || '').toLowerCase().trim();
  try {
    if (!userEmail) {
      return res.status(200).json({
        email: '', role: 'GUEST', isSuperAdmin: false,
        isAdminOrHigher: false, isCanUpload: false,
        canCreateAlbum: false, profileComplete: true
      });
    }
    const ctx = await db.getUserContext(userEmail);
    res.status(200).json(ctx);
  } catch (error) {
    // Fallback: check if email matches PRIMARY_SUPER_ADMIN
    const primaryAdmin = (process.env.PRIMARY_SUPER_ADMIN || 'ood.wirat2533@gmail.com').toLowerCase().trim();
    const isOwner = userEmail === primaryAdmin;
    res.status(200).json({
      email: userEmail,
      role: isOwner ? 'SUPER_ADMIN' : 'GUEST',
      isSuperAdmin: isOwner, isAdminOrHigher: isOwner,
      isCanUpload: isOwner, canCreateAlbum: isOwner, profileComplete: true,
      error: error.message
    });
  }
};
