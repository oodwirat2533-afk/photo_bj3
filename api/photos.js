const db = require('./lib/db');
const drive = require('./lib/drive');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      const cacheKey = `v2_folder_${folderId}_${resolvedToken || '0'}_${limit}`;
      const redis = db.getRedis();
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.status(200).json(typeof cached === 'string' ? JSON.parse(cached) : cached);
      } catch (e) { /* ignore cache error */ }

      // Default get folder contents
      const contents = await drive.getFolderContents(folderId, resolvedToken, parseInt(limit));
      
      // Save to Cache (expires in 1 hour = 3600s)
      try {
        await redis.set(cacheKey, JSON.stringify(contents), { ex: 3600 });
      } catch (e) { /* ignore cache error */ }
      
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
