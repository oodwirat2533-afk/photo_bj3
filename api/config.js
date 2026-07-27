const db = require('./lib/db');
const drive = require('./lib/drive');

function extractFolderId(input) {
  if (!input) return '';
  const str = input.trim();
  const match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  return str;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const userEmail = ((req.method === 'GET' ? req.query.userEmail : req.body.userEmail) || '').toLowerCase().trim();
    const ctx = await db.getUserContext(userEmail);

    if (req.method === 'GET') {
      const rootId = await db.getRootFolderId();
      if (!rootId) return res.status(200).json({ folderInfo: null });
      const info = await drive.getFolderInfo(rootId);
      return res.status(200).json({ folderInfo: info });
    }
    
    if (req.method === 'POST') {
      if (!ctx.isFixed) return res.status(403).json({ error: 'Forbidden. Only fixed admins can configure root.' });
      
      const { rootFolderUrl } = req.body;
      const folderId = extractFolderId(rootFolderUrl);
      if (!folderId) return res.status(400).json({ error: 'Invalid folder URL or ID' });
      
      const info = await drive.getFolderInfo(folderId);
      if (!info) return res.status(400).json({ error: 'Folder not found or accessible' });
      
      await drive.setFolderPermissions(folderId);
      await db.setRootFolderId(folderId);
      
      return res.status(200).json({ success: true, folderInfo: info });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
