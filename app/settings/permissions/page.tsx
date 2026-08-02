'use client';

import { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PermissionsSettingsPage() {
  const [folders, setFolders] = useState<any[]>([]);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
          if (data.user?.role !== 'superadmin') {
            window.location.href = '/';
          } else {
            loadPermissions();
          }
        } else {
          window.location.href = '/';
        }
      })
      .catch((err) => console.error('Session fetch error:', err));
  }, []);

  const loadPermissions = async () => {
    setLoadingFolders(true);
    try {
      const foldersRes = await fetch('/api/drive/folders');
      const foldersData = await foldersRes.json();
      
      const permsRes = await fetch('/api/permissions');
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
        return [...prev, { folder_id: folderId, can_manage: field === 'can_manage', include_subfolders: field === 'include_subfolders' }];
      }
    });
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: userPermissions }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('บันทึกสิทธิ์สำเร็จ');
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกสิทธิ์');
    } finally {
      setSavingPermissions(false);
    }
  };

  const renderFolderTree = (parentId: string | null, depth = 0) => {
    if (!parentId) return null;
    
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
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
              {renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  if (!session || session.user?.role !== 'superadmin') {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Key size={28} style={{ color: 'var(--color-primary)' }} />
        <h1 className="page-title" style={{ margin: 0 }}>จัดการสิทธิ์การเข้าถึง (Global)</h1>
      </div>

      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          ตั้งค่านี้จะมีผลกับ Admin และ ผู้ช่วย Admin ทุกคนในระบบ โดยเลือกโฟลเดอร์ที่ต้องการให้พวกเขามีสิทธิ์อัปโหลดหรือลบไฟล์
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          {loadingFolders ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดโครงสร้างโฟลเดอร์...</div>
          ) : !rootFolderId ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>ยังไม่มีการตั้งค่าโฟลเดอร์หลักในระบบ</div>
          ) : (
            renderFolderTree(rootFolderId, 0)
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSavePermissions} disabled={savingPermissions || loadingFolders}>
            {savingPermissions ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
          </button>
        </div>
      </div>
    </div>
  );
}
