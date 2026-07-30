'use client';

import { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, ArrowLeft, ExternalLink, Video, Trash2, UploadCloud, FolderPlus, Edit2, MoreVertical, ChevronRight, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from './components/ConfirmModalProvider';

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
  const { confirm } = useConfirm();
  // Gallery State
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{ total: number, message: string } | null>(null);

  // Session & Global Auth State
  const [session, setSession] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  // Listen to global go-home event
  useEffect(() => {
    const handleGoHome = () => {
      if (rootFolderId) {
        setCurrentFolderId(rootFolderId);
        setFolderHistory([]);
      }
    };
    window.addEventListener('go-home', handleGoHome);
    return () => window.removeEventListener('go-home', handleGoHome);
  }, [rootFolderId]);

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
    const previous = newHistory.pop();
    
    if (previous) {
      setFolderHistory(newHistory);
      setCurrentFolderId(previous.id);
    } else if (rootFolderId) {
      setFolderHistory([]);
      setCurrentFolderId(rootFolderId);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentFolderId) return;
    
    setUploading(true);
    const rawFilesToUpload = Array.from(e.target.files);
    
    // ตรวจสอบไฟล์ชื่อซ้ำ
    const existingFileNames = new Set(files.map(f => f.name));
    const duplicateFiles: string[] = [];
    const filesToUpload: File[] = [];

    for (const file of rawFilesToUpload) {
      if (existingFileNames.has(file.name)) {
        duplicateFiles.push(file.name);
      } else {
        filesToUpload.push(file);
      }
    }

    if (duplicateFiles.length > 0) {
      toast.error(`พบไฟล์ชื่อซ้ำอยู่ในโฟลเดอร์นี้แล้ว:\n\n${duplicateFiles.join(', ')}\n\nกรุณาเปลี่ยนชื่อไฟล์ก่อนอัปโหลด`, { duration: 5000 });
      setUploading(false);
      e.target.value = '';
      return;
    }

    setUploadStatus({ total: filesToUpload.length, message: 'กำลังเตรียมการอัปโหลด...' });
    
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // 1. Init resumable upload session
        const initRes = await fetch('/api/drive/init-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            size: file.size,
            folderId: currentFolderId
          })
        });
        
        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize upload for ' + file.name);
        
        const uploadUrl = initData.uploadUrl;
        if (!uploadUrl) throw new Error('No upload URL returned for ' + file.name);

        // 2. Upload file directly to Google Drive via PUT
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file
        });

        if (!uploadRes.ok) {
          throw new Error('Upload failed for ' + file.name);
        }
        
        // 3. Return the file metadata that Google API responds with on successful upload
        const data = await uploadRes.json();
        return data;
      });

      const results = await Promise.allSettled(uploadPromises);
      
      const successfulUploads: any[] = [];
      const failedUploads: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          failedUploads.push(filesToUpload[index].name);
        }
      });
      
      if (successfulUploads.length > 0) {
        setUploadStatus({ total: filesToUpload.length, message: 'กำลังอัปเดตข้อมูล...' });
        setFiles(prev => [...successfulUploads, ...prev]);
        setRefreshTrigger(prev => prev + 1);
        toast.success(`อัปโหลดสำเร็จ ${successfulUploads.length} ไฟล์`);
      }
      
      if (failedUploads.length > 0) {
        toast.error('อัปโหลดล้มเหลวสำหรับไฟล์: ' + failedUploads.join(', '));
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
    } finally {
      setUploading(false);
      setUploadStatus(null);
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
      toast.success('สร้างโฟลเดอร์สำเร็จ');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการสร้างโฟลเดอร์: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบ',
      message: 'ยืนยันการลบรายการนี้ออกจาก Google Drive ใช่หรือไม่? (หากลบโฟลเดอร์ ไฟล์ข้างในจะถูกลบด้วย)',
      danger: true
    });
    
    if (!isConfirmed) return;
    
    const loadingToast = toast.loading('กำลังลบข้อมูล...');
    
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
      toast.success('ลบข้อมูลสำเร็จ', { id: loadingToast });
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการลบ: ' + err.message, { id: loadingToast });
    }
  };

  const handleRename = async (e: React.MouseEvent, id: string, oldName: string) => {
    e.stopPropagation();
    const newName = prompt('ระบุชื่อใหม่:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;

    try {
      const res = await fetch('/api/drive/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      
      setRefreshTrigger(prev => prev + 1);
      toast.success('เปลี่ยนชื่อสำเร็จ');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนชื่อ: ' + err.message);
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
  const canRename = session?.user?.role === 'superadmin' || session?.user?.role === 'admin';
  const canDeleteFolder = session?.user?.role === 'superadmin';
  const canDeleteFile = session?.user?.isAdmin && session?.user?.role !== 'assistant_admin';

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        {/* Folder Navigation & Upload */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            {folderHistory.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handleBackClick}
                  className="btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
                >
                  <ArrowLeft size={16} /> ย้อนกลับ
                </button>
                <button 
                  onClick={() => {
                    if (rootFolderId) {
                      setCurrentFolderId(rootFolderId);
                      setFolderHistory([]);
                    }
                  }}
                  className="btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
                >
                  <Home size={16} /> หน้าหลัก
                </button>
              </div>
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
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                {folderHistory.length > 0 ? folderHistory.map(f => f.name).join(' / ') : 'โฟลเดอร์หลัก'}
              </h2>
              <div className="responsive-grid-wide">
                {folders.map(folder => (
                  <div 
                    key={folder.id}
                    onClick={() => handleFolderClick(folder.id, folder.name)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1.25rem', 
                      padding: '1rem', backgroundColor: 'var(--color-surface)', 
                      border: '1px solid var(--color-border)', borderRadius: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)', position: 'relative',
                      zIndex: activeDropdown === folder.id ? 100 : 1
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                  >
                    <div style={{
                      width: '56px', height: '56px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 2px 8px rgba(37, 99, 235, 0.1)'
                    }}>
                      <Folder size={28} style={{ color: '#2563eb', fill: '#bfdbfe' }} />
                    </div>

                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {folder.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        คลิกเพื่อเปิดดูอัลบั้ม
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, paddingRight: '0.5rem' }}>
                      {(canRename || canDeleteFolder) && (
                        <div className="dropdown-container" style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === folder.id ? null : folder.id); }}
                            style={{
                              backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                              border: 'none', borderRadius: '50%', padding: '0.4rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-main)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <MoreVertical size={20} />
                          </button>
                        
                        {activeDropdown === folder.id && (
                          <div 
                            style={{
                              position: 'absolute', top: '100%', right: 0, zIndex: 50,
                              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                              minWidth: '150px', overflow: 'hidden', marginTop: '0.25rem'
                            }}
                          >
                            {canRename && (
                              <button
                                onClick={(e) => { setActiveDropdown(null); handleRename(e, folder.id, folder.name); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Edit2 size={16} /> เปลี่ยนชื่อ
                              </button>
                            )}
                            {canDeleteFolder && (
                              <button
                                onClick={(e) => { setActiveDropdown(null); handleDelete(e, folder.id); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-danger)' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={16} /> ลบโฟลเดอร์
                              </button>
                            )}
                          </div>
                        )}
                        </div>
                      )}
                      
                      <ChevronRight size={20} style={{ color: '#60a5fa' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------- Media Section ----------------- */}
          {mediaFiles.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                {folderHistory.length > 0 ? folderHistory.map(f => f.name).join(' / ') : 'ไฟล์รูปภาพ/วิดีโอ'}
              </h2>
              <div className="responsive-grid">
                {mediaFiles.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => setSelectedFile(file)}
                    style={{ 
                      display: 'block', cursor: 'pointer', color: 'inherit',
                      backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                      overflow: 'hidden', border: '1px solid var(--color-border)',
                      transition: 'all 0.2s ease', position: 'relative',
                      zIndex: activeDropdown === file.id ? 100 : 1
                    }}
                    onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                    onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {(canRename || canDeleteFile) && (
                      <div className="dropdown-container" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === file.id ? null : file.id); }}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--color-text)',
                            border: 'none', borderRadius: '50%', padding: '0.5rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeDropdown === file.id && (
                          <div 
                            style={{
                              position: 'absolute', top: '100%', right: 0, zIndex: 50,
                              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                              minWidth: '150px', overflow: 'hidden', marginTop: '0.25rem'
                            }}
                          >
                            {canRename && (
                              <button
                                onClick={(e) => { setActiveDropdown(null); handleRename(e, file.id, file.name); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Edit2 size={16} /> เปลี่ยนชื่อ
                              </button>
                            )}
                            {canDeleteFile && (
                              <button
                                onClick={(e) => { setActiveDropdown(null); handleDelete(e, file.id); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-danger)' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={16} /> ลบรูปภาพ
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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

      {/* Uploading Overlay Modal */}
      {uploading && uploadStatus && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            className="card" 
            style={{ 
              maxWidth: '400px', width: '100%', padding: '3rem 2rem', 
              backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }}></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
              กำลังอัปโหลด {uploadStatus.total} ไฟล์
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              {uploadStatus.message}
            </p>
            <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '1rem', fontWeight: 500 }}>
              * กรุณาอย่าปิดหรือรีเฟรชหน้านี้ จนกว่าการอัปโหลดจะเสร็จสิ้น
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
