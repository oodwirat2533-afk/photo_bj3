// Vercel Serverless API Route: /api/auth
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Returns active user status context
  res.status(200).json({
    email: "ood.wirat2533@gmail.com",
    role: "SUPER_ADMIN",
    isSuperAdmin: true,
    isAdminOrHigher: true,
    isCanUpload: true
  });
};
