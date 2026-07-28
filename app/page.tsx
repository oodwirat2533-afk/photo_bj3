'use client';

import { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, ArrowLeft, ExternalLink, Video, Settings } from 'lucide-react';

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

  // Modal State
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

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

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (selectedFile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedFile]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            คลังภาพและวิดีโอ
          </h1>
          <a 
            href="/admin" 
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
              color: 'var(--color-text-muted)', textDecoration: 'none',
              padding: '0.5rem', borderRadius: 'var(--radius-md)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="ตั้งค่าระบบ"
          >
            <Settings size={20} />
          </a>
        </div>
        
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
                  <div 
                    key={file.id} 
                    onClick={() => setSelectedFile(file)}
                    style={{ 
                      display: 'block', cursor: 'pointer', color: 'inherit',
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
                        {file.mimeType.includes('video') && (
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '1rem', color: 'white' }}>
                            <Video size={32} />
                          </div>
                        )}
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
                    </div>
                  </div>
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

      {/* Lightbox / Modal for Viewing Media */}
      {selectedFile && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', padding: '1rem',
            backdropFilter: 'blur(5px)'
          }}
          onClick={() => setSelectedFile(null)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
            style={{
              position: 'absolute', top: '1.5rem', right: '2rem',
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              fontSize: '2rem', cursor: 'pointer', width: '48px', height: '48px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            &times;
          </button>
          
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '85vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {selectedFile.mimeType.includes('video') ? (
              <iframe 
                src={`https://drive.google.com/file/d/${selectedFile.id}/preview`} 
                style={{ width: '85vw', height: '80vh', border: 'none', borderRadius: '8px', backgroundColor: '#000' }}
                allow="autoplay"
                allowFullScreen
              ></iframe>
            ) : (
              <img 
                src={selectedFile.thumbnailLink ? selectedFile.thumbnailLink.replace('=s220', '=s2048') : ''}
                alt={selectedFile.name}
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              />
            )}
          </div>
          
          <div onClick={(e) => e.stopPropagation()} style={{ color: 'white', marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>{selectedFile.name}</p>
            <a 
              href={selectedFile.webViewLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#aaa', textDecoration: 'underline', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              เปิดใน Google Drive <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
