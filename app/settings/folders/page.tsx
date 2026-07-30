'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Folder, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function getGoogleDriveFolderId(url: string) {
  try {
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

export default function FoldersSettingsPage() {
  const [folders, setFolders] = useState<any[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Root URL
      const urlRes = await fetch('/api/urls');
      const urlData = await urlRes.json();
      const rootFolderId = urlData?.url ? getGoogleDriveFolderId(urlData.url) : null;

      if (!rootFolderId) {
        setError('ไม่พบโฟลเดอร์หลัก กรุณาตั้งค่า Google Drive ก่อน');
        setLoading(false);
        return;
      }

      // 2. Fetch all main folders (showHidden=true)
      const driveRes = await fetch(`/api/drive?folderId=${rootFolderId}&showHidden=true`);
      const driveData = await driveRes.json();
      
      if (!driveRes.ok) throw new Error(driveData.error || 'Failed to fetch folders');

      // Filter only folders
      const mainFolders = driveData.files ? driveData.files.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder') : [];
      setFolders(mainFolders);

      // 3. Fetch hidden IDs
      const hiddenRes = await fetch('/api/hidden-folders');
      const hiddenData = await hiddenRes.json();
      if (!hiddenRes.ok) throw new Error(hiddenData.error || 'Failed to fetch hidden folders');
      
      setHiddenIds(hiddenData.hiddenIds || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (folderId: string, isHidden: boolean) => {
    try {
      const res = await fetch('/api/hidden-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, hide: !isHidden })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update visibility');

      if (!isHidden) {
        setHiddenIds([...hiddenIds, folderId]);
      } else {
        setHiddenIds(hiddenIds.filter(id => id !== folderId));
      }
      toast.success(isHidden ? 'เปิดการแสดงผลโฟลเดอร์แล้ว' : 'ซ่อนโฟลเดอร์เรียบร้อย');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>จัดการโฟลเดอร์ที่แสดง</h1>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => window.history.back()}
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
        >
          <ArrowLeft size={16} /> ย้อนกลับ
        </button>
        <Link 
          href="/"
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
        >
          <Home size={16} /> หน้าหลัก
        </Link>
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>จัดการโฟลเดอร์ที่แสดง</h1>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)' }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          กำหนดว่าโฟลเดอร์หลักใดบ้างที่จะถูกแสดงหรือซ่อนในหน้าแกลลอรี่
        </p>

        {folders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            ไม่พบโฟลเดอร์หลัก
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {folders.map(folder => {
              const isHidden = hiddenIds.includes(folder.id);
              
              return (
                <div 
                  key={folder.id}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '1rem', backgroundColor: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    opacity: isHidden ? 0.7 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Folder size={20} style={{ color: isHidden ? 'var(--color-text-muted)' : 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 500, color: isHidden ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                      {folder.name}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.875rem', color: isHidden ? 'var(--color-text-muted)' : 'var(--color-primary)', fontWeight: 500 }}>
                      {isHidden ? 'ซ่อน' : 'แสดง'}
                    </span>
                    <div
                      onClick={() => toggleVisibility(folder.id, isHidden)}
                      style={{
                        width: '44px',
                        height: '24px',
                        backgroundColor: isHidden ? '#e5e7eb' : 'var(--color-primary)',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '2px',
                          left: isHidden ? '2px' : '22px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
