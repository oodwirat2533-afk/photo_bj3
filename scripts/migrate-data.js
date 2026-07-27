/**
 * Migration Script: GAS PropertiesService → Upstash Redis
 * 
 * Run this script ONCE to migrate data from the old Google Apps Script
 * backend to the new Upstash Redis database.
 * 
 * Usage:
 *   1. Set environment variables (or create .env file):
 *      - GAS_API_URL (the old GAS deployment URL)
 *      - UPSTASH_REDIS_REST_URL
 *      - UPSTASH_REDIS_REST_TOKEN
 *      - PRIMARY_SUPER_ADMIN
 *   2. Run: node scripts/migrate-data.js
 */

const { Redis } = require('@upstash/redis');

const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbxj_KsFJ89lpmxYQLlxnoZ9NoFeVMy_9gnIC0vDFImonUllNygnYZ7tNTyG0C0FBxDvWA/exec';
const PRIMARY_SUPER_ADMIN = process.env.PRIMARY_SUPER_ADMIN || 'ood.wirat2533@gmail.com';

async function gasGet(params) {
  const url = GAS_API_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('GAS returned non-JSON: ' + text.substring(0, 200)); }
}

async function main() {
  console.log('=== Migration: GAS → Upstash Redis ===\n');

  // Check Redis connection
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
    console.log('   Set these environment variables before running this script.');
    process.exit(1);
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Test Redis connection
  try {
    await redis.ping();
    console.log('✅ Redis connection successful\n');
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    process.exit(1);
  }

  // 1. Migrate User Database
  console.log('📋 Step 1: Migrating user database...');
  try {
    const usersResponse = await gasGet({ action: 'getUsersList', userEmail: PRIMARY_SUPER_ADMIN });
    const users = usersResponse.users || usersResponse;
    
    if (Array.isArray(users) && users.length > 0) {
      // Convert array to object map (email → user record)
      const userDb = {};
      for (const user of users) {
        if (user.isFixed) continue; // Skip fixed super admins (they are determined by env vars)
        const email = user.email.toLowerCase().trim();
        userDb[email] = {
          email: email,
          displayName: user.displayName || email.split('@')[0],
          role: user.role || 'PENDING',
          profileComplete: user.profileComplete !== false,
          department: user.department || '',
          addedBy: user.addedBy || '',
          requestedAt: user.requestedAt || '',
          updatedAt: user.updatedAt || '',
        };
      }
      
      await redis.set('user_database', JSON.stringify(userDb));
      console.log(`   ✅ Migrated ${Object.keys(userDb).length} users to Redis\n`);
    } else {
      console.log('   ⚠️ No users found in GAS, setting empty database\n');
      await redis.set('user_database', JSON.stringify({}));
    }
  } catch (err) {
    console.error('   ❌ Failed to migrate users:', err.message);
    console.log('   Setting empty user database...');
    await redis.set('user_database', JSON.stringify({}));
  }

  // 2. Migrate Root Folder ID
  console.log('📁 Step 2: Migrating root folder ID...');
  try {
    const folderInfo = await gasGet({ action: 'getRootFolderInfo' });
    if (folderInfo && folderInfo.id) {
      await redis.set('root_folder_id', folderInfo.id);
      console.log(`   ✅ Root folder: "${folderInfo.name}" (${folderInfo.id})\n`);
    } else {
      console.log('   ⚠️ No root folder info found, will use GOOGLE_DRIVE_ROOT_FOLDER_ID env var\n');
    }
  } catch (err) {
    console.error('   ❌ Failed to get root folder info:', err.message);
    console.log('   Will use GOOGLE_DRIVE_ROOT_FOLDER_ID env var as fallback\n');
  }

  // 3. Initialize Hidden Albums (empty by default)
  console.log('👁️ Step 3: Initializing hidden albums...');
  try {
    // We can't easily get hidden albums from GAS via public API
    // Start fresh - admin can re-hide albums from the dashboard
    const existing = await redis.get('hidden_albums');
    if (!existing) {
      await redis.set('hidden_albums', JSON.stringify([]));
      console.log('   ✅ Initialized empty hidden albums list\n');
    } else {
      console.log('   ✅ Hidden albums already exist in Redis\n');
    }
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
  }

  console.log('=== Migration Complete! ===');
  console.log('\nNext steps:');
  console.log('1. Set GOOGLE_SERVICE_ACCOUNT_KEY env var on Vercel');
  console.log('2. Set GOOGLE_DRIVE_ROOT_FOLDER_ID env var on Vercel');
  console.log('3. Set PRIMARY_SUPER_ADMIN env var on Vercel');
  console.log('4. Git push to deploy the new API routes');
  console.log('5. Test the website thoroughly');
  console.log('6. Delete the Google Apps Script file when everything works');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
