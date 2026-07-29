'use client';

import { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, ArrowLeft, ExternalLink, Video, Trash2, UploadCloud, FolderPlus } from 'lucide-react';

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
  // Gallery State
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Session & Global Auth State
  const [session, setSession] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // 1. Fetch Session & Check Onboarding
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
          
          if (data.user?.isAdmin && !data.user?.isOnboarded) {
            window.location.href = '/onboarding';
            return;
          }
        }
      })
      .catch((err) => console.error('Session fetch error:', err));
  }, []);

  // 2. Fetch Root Folder URL from DB
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

  // 3. Fetch Files when Current Folder changes
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
  }, [currentFolderId, refreshTrigger]);

  // Gallery Handlers
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentFolderId) return;
    
    setUploading(true);
    const filesToUpload = Array.from(e.target.files);
    
    try {
      const uploadedFiles = [];
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', currentFolderId);

        const res = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload ' + file.name);
        
        uploadedFiles.push(data.file);
      }
      
      setFiles(prev => [...uploadedFiles, ...prev]);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentFolderId) return;

    setCreatingFolder(true);
    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: newFolderName.trim(),
          parentFolderId: currentFolderId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');

      setFiles(prev => [data.folder, ...prev]);
      setShowCreateFolder(false);
      setNewFolderName('');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการสร้างโฟลเดอร์: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('ยืนยันการลบรายการนี้ออกจาก Google Drive ใช่หรือไม่? (ระวัง: หากลบโฟลเดอร์ ไฟล์ข้างในจะถูกลบด้วย)')) return;
    
    try {
      const res = await fetch('/api/drive/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) setSelectedFile(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
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

  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const mediaFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  const isRootFolder = currentFolderId === rootFolderId;
  const canUpload = session?.user?.isAdmin && !isRootFolder;
  const canCreateFolder = session?.user?.isAdmin && session?.user?.role !== 'assistant_admin' && (isRootFolder ? session?.user?.role === 'superadmin' : true);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        {/* Folder Navigation & Upload */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            {folderHistory.length > 0 ? (
              <button 
                onClick={handleBackClick}
                className="btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
              >
                <ArrowLeft size={16} /> ย้อนกลับ
              </button>
            ) : (
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>หน้าหลัก</h2>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canCreateFolder && currentFolderId && (
              <button
                onClick={() => setShowCreateFolder(true)}
                className="btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                  backgroundColor: 'white', border: '1px solid var(--color-border)'
                }}
              >
                <FolderPlus size={16} /> สร้างโฟลเดอร์
              </button>
            )}

            {canUpload && currentFolderId && (
              <label 
                className="btn btn-primary"
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                  cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 
                }}
              >
                <UploadCloud size={16} /> {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'}
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  multiple
                  hidden 
                  onChange={handleUpload} 
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- Status States ----------------- */}
      {!rootFolderId && !loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)', flexDirection: 'column', alignItems: 'center' }}>
            <Folder size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>ยังไม่มีข้อมูลคลังภาพ</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>กรุณารอผู้ดูแลระบบตั้งค่าโฟลเดอร์ Google Drive</p>
          </div>
        </div>
      )}

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
          {/* ----------------- Folders Section ----------------- */}
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
                      boxShadow: 'var(--shadow-sm)', position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Folder size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '2rem' }}>
                      {folder.name}
                    </span>
                    
                    {session?.user?.role === 'superadmin' && (
                      <button
                        onClick={(e) => handleDelete(e, folder.id)}
                        style={{
                          position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255,0,0,0.05)', color: 'var(--color-danger)',
                          border: 'none', borderRadius: '50%', padding: '0.4rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="ลบโฟลเดอร์นี้"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------- Media Section ----------------- */}
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
                    {session?.user?.isAdmin && session?.user?.role !== 'assistant_admin' && (
                      <button
                        onClick={(e) => handleDelete(e, file.id)}
                        style={{
                          position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10,
                          backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--color-danger)',
                          border: 'none', borderRadius: '50%', padding: '0.5rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        title="ลบรูปภาพนี้"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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

          {!loading && rootFolderId && files.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              ไม่มีไฟล์ในโฟลเดอร์นี้
            </div>
          )}
        </>
      )}

      {/* ----------------- Modals ----------------- */}
      
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

      {/* Modal for Creating Folder */}
      {showCreateFolder && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setShowCreateFolder(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="card" 
            style={{ maxWidth: '400px', width: '100%', padding: '2rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)' }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>สร้างโฟลเดอร์ใหม่</h3>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                className="input-field"
                placeholder="ชื่อโฟลเดอร์"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                autoFocus
                style={{ marginBottom: '1.5rem' }}
              />
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setShowCreateFolder(false)}
                  className="btn"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingFolder}
                >
                  {creatingFolder ? 'กำลังสร้าง...' : 'สร้างโฟลเดอร์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
