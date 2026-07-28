const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

async function main() {
  try {
    console.log('Connecting to Redis...');
    
    // Check if admin user exists
    const existingAdmin = await redis.hget('admins', 'admin');
    if (!existingAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      await redis.hset('admins', { admin: hash });
      console.log('Created default admin (Username: admin, Password: admin123)');
    } else {
      console.log('Admin user already exists');
    }

    // Initialize drive_urls if empty
    const urls = await redis.get('drive_urls');
    if (!urls) {
      const sampleUrls = [
        {
          id: '1',
          title: 'กิจกรรมกีฬาสี 2569',
          description: 'อัลบั้มรวมภาพกิจกรรมกีฬาสีประจำปี',
          url: 'https://drive.google.com/drive/folders/sample1',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'พิธีไหว้ครู',
          description: 'วิดีโอบันทึกภาพพิธีไหว้ครู',
          url: 'https://drive.google.com/drive/folders/sample2',
          createdAt: new Date().toISOString()
        }
      ];
      await redis.set('drive_urls', sampleUrls);
      console.log('Inserted sample drive URLs');
    } else {
      console.log('drive_urls already initialized');
    }

    console.log('Redis setup complete!');
  } catch (error) {
    console.error('Error setting up Redis:', error);
  }
}

main();
