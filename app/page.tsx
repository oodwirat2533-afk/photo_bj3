'use client';

import { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, ArrowLeft, ExternalLink, Video, Settings, LogIn, LogOut, Trash2, UploadCloud, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';

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

  // Session & Global Auth State
  const [session, setSession] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Admin Settings State (Superadmin Only)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [adminUrl, setAdminUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [urlSuccess, setUrlSuccess] = useState('');
  
  // User Management State (Superadmin Only)
  const [users, setUsers] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [adminLoading, setAdminLoading] = useState(false);

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

          if (data.user?.role === 'superadmin') {
            fetch('/api/users')
              .then(res => res.json())
              .then(userData => {
                if (userData && userData.users) setUsers(userData.users);
              })
              .catch(err => console.error('Failed to fetch users:', err));
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
          setAdminUrl(data.url); // for the settings form
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
  }, [currentFolderId]);

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
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', currentFolderId);

    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload');
      
      setFiles(prev => [data.file, ...prev]);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('ยืนยันการลบไฟล์นี้ออกจาก Google Drive ใช่หรือไม่?')) return;
    
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
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  // Superadmin Settings Handlers
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

      setUrlSuccess('บันทึกโฟลเดอร์หลักสำเร็จแล้ว! โปรดรีเฟรชหน้าเว็บเพื่อดูการเปลี่ยนแปลง');
      
      // Update local state so it applies if they go back
      const newId = getGoogleDriveFolderId(adminUrl);
      if (newId) {
        setRootFolderId(newId);
        setCurrentFolderId(newId);
        setFolderHistory([]);
      }
    } catch (err: any) {
      setUrlError(err.message);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    setAdminLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, role: newAdminRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const fetchRes = await fetch('/api/users');
      const fetchData = await fetchRes.json();
      if (fetchData.users) setUsers(fetchData.users);
      
      setNewAdminEmail('');
      setNewAdminRole('admin');
      alert('เพิ่มผู้ใช้สำเร็จ');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    if (!confirm(`ยืนยันการลบ ${email} ออกจากระบบ?`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setUsers(prev => prev.filter(u => u.email !== email));
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleEditRole = async (email: string, role: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role } : u));
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleConfirmLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (selectedFile || showConfirmLogout) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedFile, showConfirmLogout]);

  const roleLabels: Record<string, string> = {
    'superadmin': 'Superadmin',
    'admin': 'Admin',
    'assistant_admin': 'ผู้ช่วย Admin'
  };

  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const mediaFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  return (
    <div style={{ padding: '1rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ----------------- Header & Navigation ----------------- */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              คลังภาพและวิดีโอ
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              โรงเรียนบรรหารแจ่มใสวิทยา ๓
            </p>
          </div>
          
          {session?.user?.isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--color-surface)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{session.user.name}</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 0 }}>
                  {session.user.email} <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>({roleLabels[session.user.role] || 'Admin'})</span>
                </p>
              </div>
              <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--color-border)' }}></div>
              <button 
                onClick={() => setShowConfirmLogout(true)} 
                className="btn" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)', padding: '0.25rem 0.5rem', border: 'none', background: 'transparent' }}
                title="ออกจากระบบ"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signIn('google', { callbackUrl: '/' })} 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <LogIn size={18} /> เข้าสู่ระบบ (Admin)
            </button>
          )}
        </div>
        
        {/* Superadmin Settings Accordion */}
        {session?.user?.role === 'superadmin' && (
          <div style={{ marginBottom: '2rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              style={{ width: '100%', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isSettingsOpen ? '#f8fafc' : 'white', border: 'none', cursor: 'pointer', borderBottom: isSettingsOpen ? '1px solid var(--color-border)' : 'none', transition: 'background 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
                <Settings size={20} style={{ color: 'var(--color-primary)' }} /> 
                ตั้งค่าระบบคลังภาพ (เฉพาะ Superadmin)
              </div>
              {isSettingsOpen ? <ChevronUp size={20} color="var(--color-text-muted)" /> : <ChevronDown size={20} color="var(--color-text-muted)" />}
            </button>

            {isSettingsOpen && (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* 1. URL Settings */}
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>1. ลิงก์โฟลเดอร์ Google Drive หลัก</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>กรอกลิงก์โฟลเดอร์ที่ต้องการให้นักเรียนดูในหน้าหลัก</p>
                  
                  {urlError && <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>{urlError}</div>}
                  {urlSuccess && <div style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>{urlSuccess}</div>}

                  <form onSubmit={handleUpdateUrl} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="url"
                      className="input-field"
                      value={adminUrl}
                      onChange={(e) => setAdminUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      required
                      style={{ flex: '1 1 300px' }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={urlLoading}>
                      {urlLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </form>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }}></div>

                {/* 2. Admin Management */}
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={18} /> 2. จัดการผู้ดูแลระบบ</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>เพิ่มหรือแก้ไขสิทธิ์การเข้าใช้งานระบบ</p>

                  <form onSubmit={handleAddAdmin} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      className="input-field"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      style={{ flex: '1 1 200px' }}
                    />
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value)}
                      className="input-field"
                      style={{ flex: '0 0 140px', padding: '0.5rem' }}
                    >
                      {session?.user?.email === 'ood.wirat2533@gmail.com' && <option value="superadmin">Superadmin</option>}
                      <option value="admin">Admin</option>
                      <option value="assistant_admin">ผู้ช่วย Admin</option>
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={adminLoading}>
                      {adminLoading ? 'กำลังเพิ่ม...' : 'เพิ่มผู้ใช้'}
                    </button>
                  </form>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {users.filter(u => u.email !== session.user.email).map((u) => {
                      const isSuperadmin = u.role === 'superadmin';
                      return (
                        <li key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{u.email}</span>
                              <select
                                value={u.role}
                                onChange={(e) => handleEditRole(u.email, e.target.value)}
                                className="input-field"
                                style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem', height: 'auto', borderRadius: '1rem', backgroundColor: isSuperadmin ? 'var(--color-primary-light)' : '#f3f4f6', color: isSuperadmin ? 'var(--color-primary)' : '#4b5563', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                              >
                                {session?.user?.email === 'ood.wirat2533@gmail.com' && <option value="superadmin">Superadmin</option>}
                                <option value="admin">Admin</option>
                                <option value="assistant_admin">ผู้ช่วย Admin</option>
                              </select>
                            </div>
                            {u.first_name && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {u.title}{u.first_name} {u.last_name} ({u.subject_group})
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: u.is_onboarded ? 'green' : 'orange' }}>
                              {u.is_onboarded ? 'กรอกข้อมูลแล้ว' : 'รอเข้าสู่ระบบ'}
                            </div>
                          </div>
                          {!isSuperadmin && (
                            <button 
                              onClick={() => handleDeleteAdmin(u.email)}
                              style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                              title="ลบผู้ใช้"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Folder Navigation & Upload */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {folderHistory.length > 0 && (
            <button 
              onClick={handleBackClick}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
            >
              <ArrowLeft size={16} /> ย้อนกลับ
            </button>
          )}

          {session?.user?.isAdmin && currentFolderId && (
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
                hidden 
                onChange={handleUpload} 
                disabled={uploading}
              />
            </label>
          )}
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

      {/* Logout Confirmation Modal */}
      {showConfirmLogout && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setShowConfirmLogout(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="card" 
            style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>ยืนยันการออกจากระบบ</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              คุณต้องการออกจากระบบใช่หรือไม่?
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowConfirmLogout(false)}
                className="btn"
                style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmLogout}
                className="btn btn-primary"
                style={{ flex: 1, backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
