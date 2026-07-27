const { Redis } = require('@upstash/redis');

let redis = null;

function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  redis = new Redis({ url, token });
  return redis;
}

async function getUserDatabase() {
  const db = getRedis();
  const data = await db.get('user_database');
  return data || {};
}

async function saveUserDatabase(userDb) {
  const db = getRedis();
  await db.set('user_database', userDb);
}

async function getHiddenAlbums() {
  const db = getRedis();
  let data = await db.get('hidden_albums');
  if (!data) return [];
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch(e) { return []; }
  }
  return Array.isArray(data) ? data : [];
}

async function saveHiddenAlbums(albumIds) {
  const db = getRedis();
  const arr = Array.isArray(albumIds) ? albumIds : [];
  await db.set('hidden_albums', JSON.stringify(arr));
}

async function getRootFolderId() {
  const db = getRedis();
  const data = await db.get('root_folder_id');
  if (data) return data;
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;
}

async function setRootFolderId(folderId) {
  const db = getRedis();
  await db.set('root_folder_id', folderId);
}

async function determineUserRole(email, primarySuperAdmin, scriptOwnerEmail) {
  if (!email) return 'GUEST';
  const cleanEmail = email.toLowerCase().trim();
  const cleanPrimary = (primarySuperAdmin || 'ood.wirat2533@gmail.com').toLowerCase().trim();
  const cleanOwner = (scriptOwnerEmail || cleanPrimary).toLowerCase().trim();
  
  if (cleanEmail === cleanPrimary || cleanEmail === cleanOwner) {
    return 'SUPER_ADMIN';
  }
  
  const userDb = await getUserDatabase();
  const userRecord = userDb[cleanEmail];
  
  if (userRecord && userRecord.role) {
    return userRecord.role;
  }
  
  return 'GUEST';
}

async function getUserContext(userEmail) {
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const primarySuperAdmin = (process.env.PRIMARY_SUPER_ADMIN || 'ood.wirat2533@gmail.com').toLowerCase().trim();
  const scriptOwnerEmail = (process.env.SCRIPT_OWNER_EMAIL || primarySuperAdmin).toLowerCase().trim();
  
  const role = await determineUserRole(cleanEmail, primarySuperAdmin, scriptOwnerEmail);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdminOrHigher = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isCanUpload = isAdminOrHigher || role === 'ASSISTANT_ADMIN';
  const canCreateAlbum = isSuperAdmin;
  
  const isFixed = cleanEmail === primarySuperAdmin || cleanEmail === scriptOwnerEmail;
  const profileComplete = await getProfileComplete(cleanEmail);
  
  return {
    email: cleanEmail,
    role,
    isFixed,
    isSuperAdmin,
    isAdminOrHigher,
    isCanUpload,
    canCreateAlbum,
    profileComplete
  };
}

async function getProfileComplete(email) {
  if (!email) return true;
  const cleanEmail = email.toLowerCase().trim();
  const primarySuperAdmin = (process.env.PRIMARY_SUPER_ADMIN || 'ood.wirat2533@gmail.com').toLowerCase().trim();
  const scriptOwnerEmail = (process.env.SCRIPT_OWNER_EMAIL || primarySuperAdmin).toLowerCase().trim();
  
  if (cleanEmail === primarySuperAdmin || cleanEmail === scriptOwnerEmail) {
    return true;
  }
  
  const userDb = await getUserDatabase();
  const userRecord = userDb[cleanEmail];
  
  if (!userRecord) return true;
  return userRecord.profileComplete !== false;
}

module.exports = {
  getRedis,
  getUserDatabase,
  saveUserDatabase,
  getHiddenAlbums,
  saveHiddenAlbums,
  getRootFolderId,
  setRootFolderId,
  determineUserRole,
  getUserContext,
  getProfileComplete
};
