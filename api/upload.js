const db = require('./lib/db');
const drive = require('./lib/drive');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { userEmail, folderId, filePayloads } = req.body;
    const ctx = await db.getUserContext((userEmail || '').toLowerCase().trim());
    if (!ctx.isCanUpload) return res.status(403).json({ error: 'Forbidden' });
    
    if (!filePayloads || !Array.isArray(filePayloads)) {
      return res.status(400).json({ error: 'Invalid payloads' });
    }

    let uploadedCount = 0;
    const errors = [];
    
    for (const payload of filePayloads) {
      try {
        await drive.uploadFile(folderId, payload.name, payload.mimeType, payload.base64Data);
        uploadedCount++;
      } catch (err) {
        errors.push({ name: payload.name, error: err.message });
      }
    }
    
    return res.status(200).json({ success: true, uploadedCount, total: filePayloads.length, errors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
