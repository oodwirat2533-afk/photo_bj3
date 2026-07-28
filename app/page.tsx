'use client';

import { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, ArrowLeft, ExternalLink, Video } from 'lucide-react';

// Extract folder ID from Google Drive URL
function getGoogleDriveFolderId(url: string) {
  try {
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

export default function Home() {
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Root Folder URL from DB
  useEffect(() => {
    fetch('/api/urls')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.url) {
          const id = getGoogleDriveFolderId(data.url);
          setRootFolderId(id);
          setCurrentFolderId(id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load drive url:', err);
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
        setLoading(false);
      });
  }, []);

  // 2. Fetch Files when Current Folder changes
  useEffect(() => {
    if (!currentFolderId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/drive?folderId=${currentFolderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.files) {
          setFiles(data.files);
        }
      })
      .catch((err) => {
        console.error('Failed to load files:', err);
        setError('ไม่สามารถโหลดข้อมูลจาก Google Drive ได้');
      })
      .finally(() => setLoading(false));
  }, [currentFolderId]);

  const handleFolderClick = (folderId: string, folderName: string) => {
    if (currentFolderId) {
      setFolderHistory([...folderHistory, { id: currentFolderId, name: folderName }]);
    }
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    const newHistory = [...folderHistory];
    newHistory.pop();
    const prevFolder = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : rootFolderId;
    
    setFolderHistory(newHistory);
    setCurrentFolderId(prevFolder);
  };

  // UI States
  if (!rootFolderId && !loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '1.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)', flexDirection: 'column', alignItems: 'center' }}>
          <Folder size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>ยังไม่มีข้อมูลคลังภาพ</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>กรุณารอผู้ดูแลระบบตั้งค่าโฟลเดอร์ Google Drive</p>
        </div>
      </div>
    );
  }

  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const mediaFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  return (
    <div style={{ padding: '1rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header & Navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: '1rem' }}>
          คลังภาพและวิดีโอ
        </h1>
        
        {folderHistory.length > 0 && (
          <button 
            onClick={handleBackClick}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
          >
            <ArrowLeft size={16} /> ย้อนกลับ
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* Folders Section */}
          {folders.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>โฟลเดอร์</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {folders.map(folder => (
                  <div 
                    key={folder.id}
                    onClick={() => handleFolderClick(folder.id, folder.name)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', 
                      padding: '1rem', backgroundColor: 'var(--color-surface)', 
                      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Folder size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folder.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Section */}
          {mediaFiles.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>ไฟล์รูปภาพ/วิดีโอ</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {mediaFiles.map(file => (
                  <a 
                    key={file.id} 
                    href={file.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'block', textDecoration: 'none', color: 'inherit',
                      backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                      overflow: 'hidden', border: '1px solid var(--color-border)',
                      transition: 'all 0.2s ease', position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                    onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {file.thumbnailLink ? (
                      <div style={{ width: '100%', paddingTop: '100%', position: 'relative', backgroundColor: '#f0f0f0' }}>
                        <img 
                          src={file.thumbnailLink.replace('=s220', '=s600')} 
                          alt={file.name}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', paddingTop: '100%', position: 'relative', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                           {file.mimeType.includes('video') ? <Video size={32} /> : <ImageIcon size={32} />}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {file.name}
                      </span>
                      <ExternalLink size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!loading && files.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              ไม่มีไฟล์ในโฟลเดอร์นี้
            </div>
          )}
        </>
      )}
    </div>
  );
}
