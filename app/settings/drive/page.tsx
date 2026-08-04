'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function DriveSettingsPage() {
  const [adminUrl, setAdminUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [urlSuccess, setUrlSuccess] = useState('');
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [folderInfo, setFolderInfo] = useState<any>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
          if (data.user?.role !== 'superadmin') {
            window.location.href = '/';
          }
        } else {
          window.location.href = '/';
        }
      })
      .catch((err) => console.error('Session fetch error:', err))
      .finally(() => setCheckingSession(false));

    fetch('/api/urls')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.url) {
          setAdminUrl(data.url);
        }
      })
      .catch((err) => console.error('Failed to load drive url:', err));
  }, []);

  useEffect(() => {
    const getFolderId = (url: string) => {
      if (!url) return null;
      const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    };

    const folderId = getFolderId(adminUrl);
    if (folderId) {
      setIsLoadingInfo(true);
      fetch(`/api/debug-folder?id=${folderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.info && !data.info.error) {
            setFolderInfo(data.info);
          } else {
            setFolderInfo(null);
          }
        })
        .catch(() => setFolderInfo(null))
        .finally(() => setIsLoadingInfo(false));
    } else {
      setFolderInfo(null);
    }
  }, [adminUrl]);

  const handleUpdateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    setUrlSuccess('');
    setUrlLoading(true);

    try {
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: adminUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');

      setUrlSuccess('บันทึกโฟลเดอร์หลักสำเร็จแล้ว!');
    } catch (err: any) {
      setUrlError(err.message);
    } finally {
      setUrlLoading(false);
    }
  };

  if (checkingSession) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>Loading...</div>;
  }

  if (!session || session.user?.role !== 'superadmin') {
    return null; // Will redirect
  }
  
  const isMasterEmail = session.user.email === 'ood.wirat2533@gmail.com';

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Settings size={28} style={{ color: 'var(--color-primary)' }} />
        <h1 className="page-title" style={{ margin: 0 }}>ตั้งค่าลิงก์ Google Drive</h1>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>ลิงก์โฟลเดอร์ Google Drive หลัก</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          กรอกลิงก์โฟลเดอร์ Google Drive หลักเพียงลิงก์เดียว ระบบจะแสดงโฟลเดอร์ย่อยทั้งหมดที่อยู่ในลิงก์นี้ให้นักเรียนดูในหน้าหลักโดยอัตโนมัติ
        </p>
        
        {urlError && <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>{urlError}</div>}
        {urlSuccess && <div style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>{urlSuccess}</div>}

        <form onSubmit={handleUpdateUrl} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Google Drive Folder URL
            </label>
            <input
              type="url"
              className="input-field"
              value={adminUrl}
              onChange={(e) => setAdminUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
              disabled={!isMasterEmail}
              style={!isMasterEmail ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#9ca3af' } : {}}
            />
          </div>

          {folderInfo && (
            <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>ข้อมูลโฟลเดอร์:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>ชื่อโฟลเดอร์:</span>
                <span style={{ fontWeight: 500 }}>{folderInfo.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Folder ID:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{folderInfo.id}</span>
              </div>
            </div>
          )}
          {isLoadingInfo && (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>กำลังโหลดข้อมูลโฟลเดอร์...</div>
          )}

          {isMasterEmail && (
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={urlLoading}>
              {urlLoading ? 'กำลังบันทึก...' : 'บันทึกลิงก์โฟลเดอร์'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
