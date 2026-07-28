'use client';

import { useState, useEffect } from 'react';

// Extract folder ID from Google Drive URL
function getGoogleDriveFolderId(url: string) {
  try {
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

export default function Home() {
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/urls')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.url) {
          setDriveUrl(data.url);
        }
      })
      .catch((err) => console.error('Failed to load drive url:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--color-text-muted)' }}>กำลังโหลดคลังภาพ...</p>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const folderId = driveUrl ? getGoogleDriveFolderId(driveUrl) : null;
  const embedUrl = folderId ? `https://drive.google.com/embeddedfolderview?id=${folderId}#grid` : null;

  return (
    <div style={{ height: 'calc(100vh - 80px)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>คลังภาพและวิดีโอ</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          รวมภาพกิจกรรมและวิดีโอทั้งหมดของโรงเรียน (สามารถคลิกเข้าดูในแต่ละโฟลเดอร์ย่อยได้)
        </p>
      </div>

      {!embedUrl ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text)' }}>ยังไม่มีข้อมูลคลังภาพ</p>
            <p>กรุณารอผู้ดูแลระบบตั้งค่าโฟลเดอร์ Google Drive</p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <iframe 
            src={embedUrl} 
            width="100%" 
            height="100%" 
            frameBorder="0"
            style={{ border: 'none', display: 'block' }}
            title="Google Drive Folder"
            allow="autoplay"
          ></iframe>
        </div>
      )}
    </div>
  );
}
