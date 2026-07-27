require('dotenv').config();
const { google } = require('googleapis');
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
const drive = google.drive({ version: 'v3', auth });

async function test() {
  console.time('listFolders');
  const res = await drive.files.list({ q: "mimeType = 'application/vnd.google-apps.folder' and '1B_gT56t-2Kj-6JqH0uM2kR2R-7W8P8Tz' in parents and trashed = false", fields: 'files(id, name)' });
  console.timeEnd('listFolders');
  console.log('Folders:', res.data.files.length);
  
  console.time('listPhotos');
  const res2 = await drive.files.list({ q: "mimeType != 'application/vnd.google-apps.folder' and '1B_gT56t-2Kj-6JqH0uM2kR2R-7W8P8Tz' in parents and trashed = false", fields: 'files(id, name)', pageSize: 50 });
  console.timeEnd('listPhotos');
  console.log('Photos:', res2.data.files.length);
}
test();
