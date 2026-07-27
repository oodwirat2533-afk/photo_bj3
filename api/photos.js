const db = require('./lib/db');
const drive = require('./lib/drive');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=86400');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'GET') {
      const { action, fileId, folderId, keyword, offset = 0, limit = 50, pageToken = '' } = req.query;
      
      if (action === 'getPhotoMetadata') {
        const meta = await drive.getFileMetadata(fileId);
        return res.status(200).json(meta);
      }
      
      if (action === 'searchPhotos') {
        const rootId = await db.getRootFolderId();
        const photos = await drive.searchPhotosRecursive(rootId, keyword);
        return res.status(200).json(photos);
      }
      
      // Check Cache
      const resolvedToken = pageToken || (offset === '0' || offset === 0 ? null : offset);
      
      if (!limit || isNaN(parseInt(limit))) {
        return res.status(400).json({ error: 'Invalid limit parameter' });
      }

      // Default get folder contents
      const contents = await drive.getFolderContents(folderId, resolvedToken, parseInt(limit));
      
      
      return res.status(200).json(contents);
    }
    
    if (req.method === 'DELETE') {
      const { userEmail, fileId } = req.body || req.query;
      const ctx = await db.getUserContext((userEmail || '').toLowerCase().trim());
      if (!ctx.isAdminOrHigher) return res.status(403).json({ error: 'Forbidden' });
      
      const result = await drive.deleteFile(fileId);
      return res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
