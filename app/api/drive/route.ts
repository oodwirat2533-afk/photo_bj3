import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  if (!folderId) {
    return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
  }

  try {
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=1000&q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink)`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch from Google Drive');
    }

    if (data.files) {
      data.files.sort((a: any, b: any) => {
        const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
        const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';
        if (isAFolder && !isBFolder) return -1;
        if (!isAFolder && isBFolder) return 1;
        
        // Sort by name descending (supports Thai and natural numbers)
        return b.name.localeCompare(a.name, 'th', { numeric: true });
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Drive API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
