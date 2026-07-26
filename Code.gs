/**
 * ============================================================================
 * School Photo Management Web App - Backend (Google Apps Script)
 * ============================================================================
 */

var CONFIG = {
  PRIMARY_SUPER_ADMIN: "ood.wirat2533@gmail.com",
  DEFAULT_ROOT_FOLDER_NAME: "School_Photo_Gallery_คลังภาพโรงเรียน",
  COVER_PHOTO_COUNT: 1  // Number of cover photos per album card
};

// ============================================================================
// 2. HTTP ENTRY POINT & TEMPLATE INCLUSION
// ============================================================================

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action;

  if (action) {
    var data;
    try {
      if (action === 'getFolders') {
        data = getDriveFolders();
      } else if (action === 'getPhotos') {
        data = getFolderContents(params.folderId, params.offset, params.limit);
      } else if (action === 'searchPhotos') {
        data = searchPhotos(params.folderId, params.search);
      } else if (action === 'getUserContext') {
        data = getUserContext();
      } else if (action === 'getUsersList') {
        data = getUsersList();
      } else if (action === 'getRootFolderInfo') {
        data = getRootFolderInfo();
      } else {
        data = { error: 'Invalid action: ' + action };
      }
    } catch (err) {
      data = { error: err.toString() };
    }

    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('คลังรูปภาพและกิจกรรมโรงเรียน | School Photo Gallery')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var data = {};
  try {
    var postData;
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      postData = e ? e.parameter : {};
    }

    var action = postData.action;

    if (action === 'uploadPhotos') {
      data = uploadPhotos(postData.folderId, postData.filePayloads);
    } else if (action === 'createFolder') {
      data = createDriveFolder(postData.folderName);
    } else if (action === 'updateRootFolderUrl') {
      data = updateRootFolderUrl(postData.urlOrId);
    } else if (action === 'updateUserRole') {
      data = updateUserRole(postData.targetEmail, postData.newRole);
    } else if (action === 'requestAccess') {
      data = requestAccess(postData.displayName);
    } else if (action === 'deletePhoto') {
      data = deletePhoto(postData.fileId);
    } else {
      data = { error: 'Invalid POST action: ' + action };
    }
  } catch (err) {
    data = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================================
// 3. USER AUTHENTICATION & ROLE MANAGEMENT
// ============================================================================

function getUserContext() {
  var activeEmail = Session.getActiveUser().getEmail();
  var effectiveEmail = Session.getEffectiveUser().getEmail();
  var email = activeEmail || effectiveEmail || "";
  var role = determineUserRole(email);
  return {
    email: email,
    scriptOwnerEmail: effectiveEmail,
    role: role,
    isSuperAdmin: (role === 'SUPER_ADMIN'),
    isAdminOrHigher: (role === 'SUPER_ADMIN' || role === 'ADMIN'),
    isCanUpload: (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ASSISTANT_ADMIN')
  };
}

function determineUserRole(email) {
  if (!email) return 'GUEST';
  var cleanEmail = email.toLowerCase().trim();
  var primarySuperAdmin = CONFIG.PRIMARY_SUPER_ADMIN.toLowerCase().trim();
  var scriptOwner = Session.getEffectiveUser().getEmail().toLowerCase().trim();
  if (cleanEmail === primarySuperAdmin || cleanEmail === scriptOwner) return 'SUPER_ADMIN';
  var userDb = getUserDatabase();
  if (userDb[cleanEmail]) return userDb[cleanEmail].role || 'GUEST';
  return 'GUEST';
}

function getUserDatabase() {
  var props = PropertiesService.getScriptProperties();
  var jsonStr = props.getProperty('USER_DATABASE');
  if (!jsonStr) return {};
  try { return JSON.parse(jsonStr); } catch (err) { return {}; }
}

function saveUserDatabase(userDb) {
  PropertiesService.getScriptProperties().setProperty('USER_DATABASE', JSON.stringify(userDb));
}

function requestAccess(displayName) {
  var userCtx = getUserContext();
  if (!userCtx.email) return { success: false, message: 'ไม่พบอีเมลผู้ใช้ กรุณาเข้าสู่ระบบด้วย Google Account' };
  var email = userCtx.email.toLowerCase().trim();
  if (userCtx.isSuperAdmin) return { success: true, message: 'คุณมีสิทธิ์ Super Admin อยู่แล้ว', role: 'SUPER_ADMIN' };
  var userDb = getUserDatabase();
  var existing = userDb[email] || {};
  userDb[email] = {
    email: email,
    displayName: displayName || email.split('@')[0],
    role: existing.role && existing.role !== 'REJECTED' ? existing.role : 'PENDING',
    requestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveUserDatabase(userDb);
  return { success: true, message: 'ส่งคำขออนุมัติสิทธิ์เรียบร้อยแล้ว รอ Super Admin ดำเนินการอนุมัติ', status: userDb[email].role };
}

function getUsersList() {
  var userCtx = getUserContext();
  if (!userCtx.isSuperAdmin) throw new Error('Unauthorized: เฉพาะ Super Admin เท่านั้น');
  var userDb = getUserDatabase();
  var list = [];
  list.push({ email: CONFIG.PRIMARY_SUPER_ADMIN, displayName: 'Super Admin (Primary)', role: 'SUPER_ADMIN', isFixed: true });
  var ownerEmail = Session.getEffectiveUser().getEmail();
  if (ownerEmail.toLowerCase() !== CONFIG.PRIMARY_SUPER_ADMIN.toLowerCase()) {
    list.push({ email: ownerEmail, displayName: 'Super Admin (Project Owner)', role: 'SUPER_ADMIN', isFixed: true });
  }
  for (var email in userDb) {
    var u = userDb[email];
    if (email.toLowerCase() !== CONFIG.PRIMARY_SUPER_ADMIN.toLowerCase() && email.toLowerCase() !== ownerEmail.toLowerCase()) {
      list.push({ email: u.email, displayName: u.displayName || u.email, role: u.role || 'PENDING', requestedAt: u.requestedAt || '', updatedAt: u.updatedAt || '', isFixed: false });
    }
  }
  return list;
}

function updateUserRole(targetEmail, newRole) {
  var userCtx = getUserContext();
  if (!userCtx.isSuperAdmin) throw new Error('Unauthorized: เฉพาะ Super Admin เท่านั้น');
  if (!targetEmail) throw new Error('Target email is required');
  var cleanEmail = targetEmail.toLowerCase().trim();
  if (cleanEmail === CONFIG.PRIMARY_SUPER_ADMIN.toLowerCase() || cleanEmail === Session.getEffectiveUser().getEmail().toLowerCase()) {
    throw new Error('ไม่สามารถแก้ไขสิทธิ์ของ Primary Super Admin หรือ เจ้าของโปรเจกต์ได้');
  }
  var userDb = getUserDatabase();
  if (!userDb[cleanEmail]) userDb[cleanEmail] = { email: cleanEmail, displayName: cleanEmail.split('@')[0] };
  userDb[cleanEmail].role = newRole;
  userDb[cleanEmail].updatedAt = new Date().toISOString();
  saveUserDatabase(userDb);
  return { success: true, message: 'อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว' };
}

// ============================================================================
// 4. GOOGLE DRIVE MANAGEMENT
// ============================================================================

function extractFolderId(input) {
  if (!input) return "";
  var str = input.trim();
  var match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  var matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  return str;
}

function updateRootFolderUrl(urlOrId) {
  var userCtx = getUserContext();
  if (!userCtx.isSuperAdmin) throw new Error('Unauthorized: เฉพาะ Super Admin เท่านั้น');
  var folderId = extractFolderId(urlOrId);
  if (!folderId) throw new Error('กรุณาระบุ Google Drive Folder URL หรือ Folder ID ให้ถูกต้อง');
  var folder;
  try { folder = DriveApp.getFolderById(folderId); } catch (e) {
    throw new Error('ไม่สามารถเข้าถึงโฟลเดอร์นี้ได้');
  }
  try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  PropertiesService.getScriptProperties().setProperty('ROOT_FOLDER_ID', folderId);
  return { success: true, message: 'บันทึกและเชื่อมต่อโฟลเดอร์ Google Drive เรียบร้อยแล้ว', folderName: folder.getName(), folderId: folderId, folderUrl: "https://drive.google.com/drive/folders/" + folderId };
}

function getRootFolderInfo() {
  var folder = getRootFolder();
  return { id: folder.getId(), name: folder.getName(), url: "https://drive.google.com/drive/folders/" + folder.getId() };
}

function getRootFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('ROOT_FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) {}
  }
  var folders = DriveApp.getFoldersByName(CONFIG.DEFAULT_ROOT_FOLDER_NAME);
  var rootFolder;
  if (folders.hasNext()) {
    rootFolder = folders.next();
  } else {
    rootFolder = DriveApp.createFolder(CONFIG.DEFAULT_ROOT_FOLDER_NAME);
    rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  props.setProperty('ROOT_FOLDER_ID', rootFolder.getId());
  return rootFolder;
}

/**
 * Get one cover photo from a folder (fast - stops after first image found)
 */
function getCoverPhoto(folder) {
  try {
    var filesIter = folder.getFiles();
    while (filesIter.hasNext()) {
      var file = filesIter.next();
      var actualFile = file;
      if (file.getMimeType() === "application/vnd.google-apps.shortcut") {
        try { actualFile = DriveApp.getFileById(file.getTargetId()); } catch (e) { continue; }
      }
      if (isImageFile(actualFile.getMimeType(), actualFile.getName())) {
        return "https://lh3.googleusercontent.com/d/" + actualFile.getId() + "=s400";
      }
    }
    var subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      var sub = subFolders.next();
      var cover = getCoverPhoto(sub);
      if (cover) return cover;
    }
  } catch (e) {
    Logger.log("Error reading cover photo: " + e.toString());
  }
  return null;
}

/**
 * Count files (non-recursive, for speed)
 */
function countFilesInFolderShallow(folder) {
  var count = 0;
  var filesIter = folder.getFiles();
  while (filesIter.hasNext()) {
    var file = filesIter.next();
    if (isImageFile(file.getMimeType(), file.getName())) count++;
  }
  return count;
}

/**
 * getDriveFolders — returns album cards with cover photo thumbnails
 * Each album includes coverUrl for fast display without loading all photos
 */
/**
 * getDriveFolders — returns root-level album cards with cover photos
 */
function getDriveFolders() {
  var root = getRootFolder();
  var list = [];

  list.push({
    id: root.getId(),
    name: 'รูปภาพทั้งหมด (All Photos)',
    isRoot: true
  });

  var foldersIter = root.getFolders();
  while (foldersIter.hasNext()) {
    var f = foldersIter.next();
    list.push({
      id: f.getId(),
      name: f.getName(),
      isRoot: false,
      updatedAt: f.getLastUpdated().toISOString()
    });
  }

  return list;
}

/**
 * getFolderContents — smart function that checks if a folder has subfolders.
 * If subfolders exist  → returns them as folder list items (fast!).
 * If no subfolders     → returns the FIRST page of photos only.
 */
function getFolderContents(folderId, offset, limit) {
  var folder;
  try { folder = DriveApp.getFolderById(folderId); } catch (e) { folder = getRootFolder(); }

  var startOffset = parseInt(offset || 0, 10);
  var pageSize = parseInt(limit || 24, 10);

  if (startOffset > 0) {
    var photos = getDirectPhotos(folder, '', startOffset, pageSize);
    return {
      type: 'photos',
      subfolders: [],
      directPhotos: photos
    };
  }

  var subfolderIter = folder.getFolders();
  var subfolders = [];
  while (subfolderIter.hasNext()) {
    var sub = subfolderIter.next();
    subfolders.push({
      id: sub.getId(),
      name: sub.getName(),
      isRoot: false
    });
  }

  var directPhotos = getDirectPhotos(folder, '', 0, pageSize);
  return {
    type: subfolders.length > 0 ? 'subfolders' : 'photos',
    subfolders: subfolders,
    directPhotos: directPhotos
  };
}

/**
 * getDirectPhotos — get photos directly inside a folder with pagination.
 * offset: start index (0-based)
 * limit:  max items to return (default 24)
 * Returns: { items, total, hasMore, nextOffset }
 */
function getDirectPhotos(folder, searchKeyword, offset, limit) {
  var keyword = (searchKeyword || '').toLowerCase().trim();
  var pageSize = limit || 24;
  var startAt = offset || 0;

  // Collect ALL matching photos first (metadata only, fast)
  var allPhotos = [];
  var filesIter = folder.getFiles();
  while (filesIter.hasNext()) {
    var file = filesIter.next();
    var actualFile = file;
    if (file.getMimeType() === 'application/vnd.google-apps.shortcut') {
      try { actualFile = DriveApp.getFileById(file.getTargetId()); } catch (e) { continue; }
    }
    var mime = actualFile.getMimeType();
    var fileName = actualFile.getName();
    if (isImageFile(mime, fileName)) {
      if (keyword && fileName.toLowerCase().indexOf(keyword) === -1) continue;
      var fileId = actualFile.getId();
      allPhotos.push({
        id: fileId,
        name: fileName,
        size: formatBytes(actualFile.getSize()),
        mimeType: mime,
        created: actualFile.getDateCreated().toLocaleDateString('th-TH'),
        createdIso: actualFile.getDateCreated().toISOString(),
        thumbnailLink: 'https://lh3.googleusercontent.com/d/' + fileId + '=s300',  // s300 = faster
        viewLink:      'https://lh3.googleusercontent.com/d/' + fileId + '=s1600', // full res for lightbox
        downloadLink:  'https://drive.google.com/uc?export=download&id=' + fileId
      });
    }
  }

  allPhotos.sort(function(a, b) { return new Date(b.createdIso) - new Date(a.createdIso); });

  var total = allPhotos.length;
  var page  = allPhotos.slice(startAt, startAt + pageSize);

  return {
    items: page,
    total: total,
    hasMore: (startAt + pageSize) < total,
    nextOffset: startAt + pageSize
  };
}

/**
 * loadMorePhotos — called from client when user clicks "Load more"
 */
function loadMorePhotos(folderId, offset, searchKeyword) {
  var folder;
  try { folder = DriveApp.getFolderById(folderId); } catch (e) { folder = getRootFolder(); }
  return getDirectPhotos(folder, searchKeyword || '', offset, 24);
}

function createDriveFolder(folderName) {
  var userCtx = getUserContext();
  if (!userCtx.isAdminOrHigher) throw new Error('Unauthorized: เฉพาะ Admin หรือ Super Admin เท่านั้น');
  if (!folderName || !folderName.trim()) throw new Error('ชื่อโฟลเดอร์ไม่สามารถเป็นค่าว่างได้');
  var root = getRootFolder();
  var newFolder = root.createFolder(folderName.trim());
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { success: true, folder: { id: newFolder.getId(), name: newFolder.getName(), isRoot: false, count: 0, coverUrl: null } };
}

/**
 * searchPhotos — recursive search across all subfolders (used for search bar only)
 */
function searchPhotos(folderId, searchKeyword) {
  var targetFolder;
  if (!folderId || folderId === 'root') {
    targetFolder = getRootFolder();
  } else {
    try { targetFolder = DriveApp.getFolderById(folderId); } catch (e) { targetFolder = getRootFolder(); }
  }
  var photoList = [];
  collectPhotosRecursive(targetFolder, searchKeyword, photoList);
  photoList.sort(function(a, b) { return new Date(b.createdIso) - new Date(a.createdIso); });
  return photoList;
}

function collectPhotosRecursive(folder, searchKeyword, photoList) {
  var keyword = (searchKeyword || '').toLowerCase().trim();
  var filesIter = folder.getFiles();
  while (filesIter.hasNext()) {
    var file = filesIter.next();
    var actualFile = file;
    if (file.getMimeType() === 'application/vnd.google-apps.shortcut') {
      try { actualFile = DriveApp.getFileById(file.getTargetId()); } catch (e) { continue; }
    }
    var mime = actualFile.getMimeType();
    var fileName = actualFile.getName();
    if (isImageFile(mime, fileName)) {
      if (keyword && fileName.toLowerCase().indexOf(keyword) === -1) continue;
      var fileId = actualFile.getId();
      photoList.push({
        id: fileId, name: fileName, size: formatBytes(actualFile.getSize()), mimeType: mime,
        created: actualFile.getDateCreated().toLocaleDateString('th-TH'),
        createdIso: actualFile.getDateCreated().toISOString(),
        thumbnailLink: 'https://lh3.googleusercontent.com/d/' + fileId + '=s600',
        viewLink: 'https://lh3.googleusercontent.com/d/' + fileId + '=s1600',
        downloadLink: 'https://drive.google.com/uc?export=download&id=' + fileId
      });
    }
  }
  var subFolders = folder.getFolders();
  while (subFolders.hasNext()) { collectPhotosRecursive(subFolders.next(), searchKeyword, photoList); }
}

function isImageFile(mimeType, fileName) {
  if (mimeType && mimeType.toLowerCase().indexOf('image/') === 0) return true;
  if (fileName) {
    var ext = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|tiff|raw|svg)$/);
    if (ext) return true;
  }
  return false;
}

function uploadPhotos(targetFolderId, filePayloads) {
  var userCtx = getUserContext();
  if (!userCtx.isCanUpload) throw new Error('Unauthorized: คุณไม่มีสิทธิ์อัปโหลดรูปภาพ');
  if (!filePayloads || !filePayloads.length) throw new Error('ไม่มีไฟล์รูปภาพถูกส่งมา');
  var folder;
  try { folder = DriveApp.getFolderById(targetFolderId); } catch (e) { folder = getRootFolder(); }
  var uploadedCount = 0, errors = [];
  for (var i = 0; i < filePayloads.length; i++) {
    var item = filePayloads[i];
    try {
      var raw = item.base64Data;
      if (raw.indexOf(',') !== -1) raw = raw.split(',')[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(raw), item.mimeType || MimeType.JPEG, item.name);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      uploadedCount++;
    } catch (err) { errors.push(item.name + ': ' + err.toString()); }
  }
  return { success: true, uploadedCount: uploadedCount, total: filePayloads.length, errors: errors };
}

function deletePhoto(fileId) {
  var userCtx = getUserContext();
  if (!userCtx.isAdminOrHigher) throw new Error('Unauthorized: เฉพาะ Admin หรือ Super Admin เท่านั้น');
  try { DriveApp.getFileById(fileId).setTrashed(true); return { success: true, message: 'ลบรูปภาพเรียบร้อยแล้ว' }; }
  catch (e) { throw new Error('ไม่สามารถลบรูปภาพได้: ' + e.toString()); }
}

function formatBytes(bytes, decimals) {
  if (bytes === 0) return '0 Bytes';
  var k = 1024, dm = decimals || 2, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
