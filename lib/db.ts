import { sql } from '@vercel/postgres';

export interface DriveUrl {
  id: number;
  url: string;
  title: string;
  description?: string;
  created_at: string;
}

export { sql };
