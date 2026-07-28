import { GoogleAuth } from 'google-auth-library';

export async function getServiceAccountToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Google Service Account credentials missing from environment variables.');
  }

  // Handle newlines in private key if they were escaped
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  return accessToken.token;
}
