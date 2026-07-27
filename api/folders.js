const db = require('./lib/db');
const drive = require('./lib/drive');

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
      if (!rootId) return res.status(200).json([]);
      const folders = await drive.listFolders(rootId);
      const hidden = await db.getHiddenAlbums();
      const merged = folders.map(f => ({ ...f, isHidden: hidden.includes(f.id) }));
      return res.status(200).json(merged);
    }
    
    if (req.method === 'POST') {
      const { action, folderId, folderName } = req.body;
      if (action === 'toggleVisibility') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });
        let hidden = await db.getHiddenAlbums();
        if (hidden.includes(folderId)) {
          hidden = hidden.filter(id => id !== folderId);
        } else {
          hidden.push(folderId);
        }
        await db.saveHiddenAlbums(hidden);
        return res.status(200).json({ success: true, isHidden: hidden.includes(folderId) });
      }
      
      // Default createFolder
      if (!ctx.canCreateAlbum) return res.status(403).json({ error: 'Forbidden' });
      const rootId = await db.getRootFolderId();
      if (!rootId) return res.status(500).json({ error: 'Root folder not configured' });
      const result = await drive.createFolder(rootId, folderName);
      return res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
