import { OAuth2Client } from 'google-auth-library';

export async function getDriveAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials (including Refresh Token) missing from environment variables.');
  }

  const oAuth2Client = new OAuth2Client(clientId, clientSecret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const { token } = await oAuth2Client.getAccessToken();

  if (!token) {
    throw new Error('Failed to generate access token from refresh token.');
  }

  return token;
}
