'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModalProvider';

export default function UsersSettingsPage() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [adminLoading, setAdminLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Permissions Modal State
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
          if (data.user?.role !== 'superadmin') {
            window.location.href = '/';
          } else {
            fetchUsers();
          }
        } else {
          window.location.href = '/';
        }
      })
      .catch((err) => console.error('Session fetch error:', err))
      .finally(() => setCheckingSession(false));
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
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
      
      await fetchUsers();
      setNewAdminEmail('');
      setNewAdminRole('admin');
      toast.success('เพิ่มผู้ใช้สำเร็จ');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบผู้ใช้งาน',
      message: `ยืนยันการลบ ${email} ออกจากระบบ?`,
      danger: true
    });
    if (!isConfirmed) return;
    
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setUsers(prev => prev.filter(u => u.email !== email));
      toast.success('ลบผู้ใช้เรียบร้อย');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
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
      toast.success('อัปเดตสิทธิ์สำเร็จ');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleManagePermissions = async (email: string) => {
    setSelectedUserEmail(email);
    setPermissionsModalOpen(true);
    setLoadingFolders(true);
    try {
      const foldersRes = await fetch('/api/drive/folders');
      const foldersData = await foldersRes.json();
      
      const permsRes = await fetch(`/api/permissions?email=${email}`);
      const permsData = await permsRes.json();
      
      setFolders(foldersData.folders || []);
      setRootFolderId(foldersData.rootFolderId || null);
      setUserPermissions(permsData.permissions || []);
    } catch (err) {
      toast.error('Failed to load permissions data');
    } finally {
      setLoadingFolders(false);
    }
  };

  const togglePermission = (folderId: string, field: 'can_manage' | 'include_subfolders') => {
    setUserPermissions(prev => {
      const existing = prev.find(p => p.folder_id === folderId);
      if (existing) {
        if (field === 'can_manage' && existing.can_manage && !existing.include_subfolders) {
           return prev.filter(p => p.folder_id !== folderId);
        }
        return prev.map(p => p.folder_id === folderId ? { ...p, [field]: !p[field] } : p);
      } else {
        return [...prev, { folder_id: folderId, can_manage: field === 'can_manage', include_subfolders: field === 'include_subfolders', user_email: selectedUserEmail }];
      }
    });
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedUserEmail, permissions: userPermissions }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('บันทึกสิทธิ์สำเร็จ');
      setPermissionsModalOpen(false);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกสิทธิ์');
    } finally {
      setSavingPermissions(false);
    }
  };

  const renderFolderTree = (parentId: string | null, depth = 0) => {
    if (!parentId) return null;
    
    // Find the folder itself if depth === 0 to render the root
    let itemsToRender = [];
    if (depth === 0) {
      const rootFolder = folders.find(f => f.id === parentId);
      if (rootFolder) itemsToRender.push(rootFolder);
    } else {
      itemsToRender = folders.filter(f => f.parents?.[0] === parentId);
    }
    
    if (itemsToRender.length === 0) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? '20px' : '0', marginTop: depth > 0 ? '8px' : '0' }}>
        {itemsToRender.map(folder => {
          const perm = userPermissions.find(p => p.folder_id === folder.id) || { can_manage: false, include_subfolders: false };
          return (
            <div key={folder.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ flexGrow: 1, fontWeight: depth === 0 ? 600 : 400 }}>{folder.name}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={perm.can_manage} onChange={() => togglePermission(folder.id, 'can_manage')} style={{ cursor: 'pointer' }} />
                  ให้สิทธิ์
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={perm.include_subfolders} onChange={() => togglePermission(folder.id, 'include_subfolders')} style={{ cursor: 'pointer' }} />
                  รวมโฟลเดอร์ย่อย
                </label>
              </div>
              {/* Recursively render children if it's root (depth 0) or any children */}
              {renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  if (checkingSession) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>Loading...</div>;
  }

  if (!session || session.user?.role !== 'superadmin') {
    return null;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Users size={28} style={{ color: 'var(--color-primary)' }} />
        <h1 className="page-title" style={{ margin: 0 }}>จัดการผู้ดูแลระบบ</h1>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} /> เพิ่มผู้ดูแลระบบใหม่
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          เพิ่มอีเมลของบุคลากรที่ต้องการให้สามารถเข้ามาจัดการโฟลเดอร์หรืออัปโหลด/ลบรูปภาพได้
        </p>

        <form onSubmit={handleAddAdmin} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
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

        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            รายชื่อผู้ใช้งานในระบบ
          </h3>
          
          {users.filter(u => u.email !== session.user.email).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>ยังไม่มีผู้ใช้งานอื่นในระบบ</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.filter(u => u.email !== session.user.email).map((u) => {
                const isSuperadmin = u.role === 'superadmin';
                const isMasterAdmin = u.email === 'ood.wirat2533@gmail.com';
                
                return (
                  <li key={u.email} className="user-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="user-info-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                      {u.first_name && (
                        <>
                          <div className="user-name-line" style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                            {u.title}{u.first_name} {u.last_name}
                          </div>
                          <div className="user-subject-line" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            <span className="subject-bracket-left">(</span>{u.subject_group}<span className="subject-bracket-right">)</span>
                          </div>
                        </>
                      )}
                      <div className="user-email-role-line" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: u.first_name ? '0.25rem' : '0' }}>
                        <span className="user-email" style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', wordBreak: 'break-all' }}>{u.email}</span>
                        <select
                          value={u.role}
                          onChange={(e) => handleEditRole(u.email, e.target.value)}
                          className="input-field user-role-select"
                          disabled={isMasterAdmin}
                          style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem', height: 'auto', borderRadius: '1rem', backgroundColor: isSuperadmin ? 'var(--color-primary-light)' : '#f3f4f6', color: isSuperadmin ? 'var(--color-primary)' : '#4b5563', border: 'none', fontWeight: 600, cursor: isMasterAdmin ? 'not-allowed' : 'pointer', opacity: isMasterAdmin ? 0.7 : 1 }}
                        >
                          { (session?.user?.email === 'ood.wirat2533@gmail.com' || isSuperadmin) && <option value="superadmin">Superadmin</option> }
                          <option value="admin">Admin</option>
                          <option value="assistant_admin">ผู้ช่วย Admin</option>
                        </select>
                      </div>
                      <div className="user-status-line" style={{ fontSize: '0.75rem', fontWeight: 500, color: u.is_onboarded ? 'var(--color-success)' : 'orange', marginTop: '0.25rem' }}>
                        {u.is_onboarded ? 'กรอกข้อมูลแล้ว' : 'รอเข้าสู่ระบบครั้งแรก'}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {!isSuperadmin && (
                        <button
                          onClick={() => handleManagePermissions(u.email)}
                          style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="จัดการสิทธิ์โฟลเดอร์"
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Key size={18} />
                        </button>
                      )}
                      {!isSuperadmin && (
                        <button 
                          onClick={() => handleDeleteAdmin(u.email)}
                          style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="ลบผู้ใช้"
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {permissionsModalOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setPermissionsModalOpen(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} style={{ color: 'var(--color-primary)' }} />
                จัดการสิทธิ์โฟลเดอร์: {selectedUserEmail}
              </h2>
              <button onClick={() => setPermissionsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1 }}>
              {loadingFolders ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดโครงสร้างโฟลเดอร์...</div>
              ) : !rootFolderId ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>ยังไม่มีการตั้งค่าโฟลเดอร์หลักในระบบ</div>
              ) : (
                renderFolderTree(rootFolderId, 0)
              )}
            </div>
            
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn" onClick={() => setPermissionsModalOpen(false)}>
                ยกเลิก
              </button>
              <button className="btn btn-primary" onClick={handleSavePermissions} disabled={savingPermissions || loadingFolders}>
                {savingPermissions ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
