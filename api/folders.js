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
      const hiddenList = await db.getHiddenAlbums();
      const hiddenMap = {};
      if (Array.isArray(hiddenList)) {
        hiddenList.forEach(id => { if (id) hiddenMap[String(id).trim()] = true; });
      }
      const merged = folders.map(f => ({ ...f, isHidden: !!hiddenMap[String(f.id).trim()] }));
      
      return res.status(200).json(merged);
    }
    
    if (req.method === 'POST') {
      const { action, folderName } = req.body;
      if (action === 'toggleVisibility') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });
        const targetAlbumId = req.body.albumId || req.body.folderId;
        if (!targetAlbumId) return res.status(400).json({ error: 'Missing albumId' });
        const shouldHide = req.body.isHidden !== undefined ? !!req.body.isHidden : true;
        
        let hidden = await db.getHiddenAlbums();
        if (!Array.isArray(hidden)) hidden = [];
        
        if (shouldHide) {
          if (!hidden.includes(targetAlbumId)) hidden.push(targetAlbumId);
        } else {
          hidden = hidden.filter(id => id !== targetAlbumId);
        }
        
        await db.saveHiddenAlbums(hidden);
        return res.status(200).json({ success: true, isHidden: hidden.includes(targetAlbumId) });
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
