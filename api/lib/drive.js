const { google } = require('googleapis');
const { Readable } = require('stream');

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const IMAGE_MIMETYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
  'image/heic', 'image/heif', 'image/bmp', 'image/tiff', 'image/svg+xml'
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.svg'];

function isImageFile(mimeType, fileName) {
  if (IMAGE_MIMETYPES.includes(mimeType)) return true;
  if (!fileName) return false;
  const ext = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  return IMAGE_EXTENSIONS.includes(`.${ext}`);
}

async function listFolders(parentId) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name, modifiedTime)',
    pageSize: 1000,
  });
  
  return (res.data.files || []).map(f => ({
    id: f.id,
    name: f.name,
    isRoot: false,
    isHidden: false,
    updatedAt: f.modifiedTime
  }));
}

async function listPhotos(folderId, offset = 0, limit = 50, search = '') {
  const drive = getDriveClient();
  let allFiles = [];
  let pageToken = null;
  
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken: pageToken
    });
    
    const files = res.data.files || [];
    const imageFiles = files.filter(f => isImageFile(f.mimeType, f.name));
    
    allFiles = allFiles.concat(imageFiles);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  if (search) {
    const s = search.toLowerCase();
    allFiles = allFiles.filter(f => f.name.toLowerCase().includes(s));
  }

  const total = allFiles.length;
  const items = allFiles.slice(offset, offset + limit).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    thumbnailLink: `https://lh3.googleusercontent.com/d/${f.id}=s300`,
    viewLink: `https://lh3.googleusercontent.com/d/${f.id}=s1600`,
    downloadLink: `https://drive.google.com/uc?export=download&id=${f.id}`
  }));

  const nextOffset = offset + limit;
  const hasMore = nextOffset < total;

  return { items, total, hasMore, nextOffset };
}

async function getFolderContents(folderId, offset = 0, limit = 50) {
  if (offset > 0) {
    const directPhotos = await listPhotos(folderId, offset, limit);
    return { type: 'photos', subfolders: [], directPhotos };
  }
  
  const subfolders = await listFolders(folderId);
  const directPhotos = await listPhotos(folderId, 0, limit);
  
  return {
    type: subfolders.length > 0 ? 'subfolders' : 'photos',
    subfolders,
    directPhotos
  };
}

async function setFolderPermissions(folderId) {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });
}

async function createFolder(parentId, name) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name'
  });
  
  const folder = res.data;
  await setFolderPermissions(folder.id);
  
  return {
    success: true,
    folder: {
      id: folder.id,
      name: folder.name,
      isRoot: false,
      count: 0,
      coverUrl: null
    }
  };
}

async function uploadFile(folderId, name, mimeType, base64Data) {
  const drive = getDriveClient();
  
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  
  const res = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId]
    },
    media: {
      mimeType,
      body: stream
    },
    fields: 'id'
  });
  
  const fileId = res.data.id;
  await setFolderPermissions(fileId);
  
  return fileId;
}

async function deleteFile(fileId) {
  const drive = getDriveClient();
  await drive.files.update({
    fileId,
    requestBody: {
      trashed: true
    }
  });
  return { success: true };
}

async function getFileMetadata(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, size, createdTime'
  });
  
  const f = res.data;
  const size = f.size ? formatBytes(f.size) : '0 Bytes';
  const createdDate = f.createdTime ? new Date(f.createdTime) : new Date();
  const created = createdDate.toLocaleDateString('th-TH');
  
  return {
    id: f.id,
    name: f.name,
    size,
    created
  };
}

async function searchPhotosRecursive(folderId, keyword) {
  const drive = getDriveClient();
  let allImages = [];
  const s = keyword.toLowerCase();
  
  async function traverse(currentFolderId) {
    const folders = await listFolders(currentFolderId);
    
    let pageToken = null;
    do {
      const res = await drive.files.list({
        q: `'${currentFolderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
        pageSize: 1000,
        pageToken: pageToken
      });
      
      const files = res.data.files || [];
      const imageFiles = files.filter(f => isImageFile(f.mimeType, f.name));
      allImages = allImages.concat(imageFiles);
      
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    
    for (const folder of folders) {
      await traverse(folder.id);
    }
  }
  
  await traverse(folderId);
  
  allImages = allImages.filter(f => f.name.toLowerCase().includes(s));
  
  return allImages.map(f => {
    const createdDate = f.createdTime ? new Date(f.createdTime) : new Date();
    return {
      id: f.id,
      name: f.name,
      size: f.size ? formatBytes(f.size) : '0 Bytes',
      mimeType: f.mimeType,
      created: createdDate.toLocaleDateString('th-TH'),
      createdIso: createdDate.toISOString(),
      thumbnailLink: `https://lh3.googleusercontent.com/d/${f.id}=s300`,
      viewLink: `https://lh3.googleusercontent.com/d/${f.id}=s1600`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${f.id}`
    };
  }).sort((a, b) => b.createdIso.localeCompare(a.createdIso));
}

async function getFolderInfo(folderId) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'id, name'
  });
  
  return {
    id: res.data.id,
    name: res.data.name,
    url: `https://drive.google.com/drive/folders/${res.data.id}`
  };
}

module.exports = {
  getDriveClient,
  listFolders,
  listPhotos,
  getFolderContents,
  createFolder,
  uploadFile,
  deleteFile,
  getFileMetadata,
  searchPhotosRecursive,
  getFolderInfo,
  setFolderPermissions,
  formatBytes,
  isImageFile
};
