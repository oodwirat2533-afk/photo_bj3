'use client';

import { useState, useEffect } from 'react';
import { Key, ChevronRight, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const FolderNode = ({ folder, folders, userPermissions, togglePermission, depth, inherited = false }: any) => {
  const [expanded, setExpanded] = useState(false);
  
  const explicitPerm = userPermissions.find((p: any) => p.folder_id === folder.id);
  const isPermitted = explicitPerm ? explicitPerm.can_manage : inherited;
  const children = folders.filter((f: any) => f.parents?.[0] === folder.id);
  const hasChildren = children.length > 0;
  
  const willPassInheritance = explicitPerm 
    ? (explicitPerm.can_manage && explicitPerm.include_subfolders) 
    : inherited;

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : '0', marginTop: depth > 0 ? '8px' : '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        
        {hasChildren ? (
          <button 
            onClick={() => setExpanded(!expanded)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (
          <div style={{ width: '26px' }} />
        )}

        <span style={{ flexGrow: 1, fontWeight: depth === 0 ? 600 : 400, wordBreak: 'break-word' }}>{folder.name}</span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: isPermitted ? 'var(--color-primary)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {isPermitted ? (inherited && !explicitPerm ? 'อนุญาตแล้ว (ออโต้)' : 'อนุญาตแล้ว') : (explicitPerm && !explicitPerm.can_manage ? 'ไม่อนุญาต (ตั้งค่าไว้)' : 'ไม่อนุญาต')}
          </span>
          <button
            onClick={() => togglePermission(folder.id, isPermitted)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: isPermitted ? 'var(--color-primary)' : '#d1d5db',
              position: 'relative',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              flexShrink: 0
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: 'white',
              position: 'absolute',
              top: '3px',
              left: isPermitted ? '23px' : '3px',
              transition: 'left 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div>
          {children.map((child: any) => (
            <FolderNode key={child.id} folder={child} folders={folders} userPermissions={userPermissions} togglePermission={togglePermission} depth={depth + 1} inherited={willPassInheritance} />
          ))}
        </div>
      )}
    </div>
  );
};

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
      
      const hiddenRes = await fetch('/api/hidden-folders');
      const hiddenData = await hiddenRes.json();
      const hiddenIds = hiddenData.hiddenIds || [];

      const permsRes = await fetch('/api/permissions');
      const permsData = await permsRes.json();
      
      const allFolders = foldersData.folders || [];
      const visibleFolders = allFolders.filter((f: any) => !hiddenIds.includes(f.id));

      setFolders(visibleFolders);
      setRootFolderId(foldersData.rootFolderId || null);
      setUserPermissions(permsData.permissions || []);
    } catch (err) {
      toast.error('Failed to load permissions data');
    } finally {
      setLoadingFolders(false);
    }
  };

  const togglePermission = async (folderId: string, currentPermittedState: boolean) => {
    // 1. Calculate new state immediately
    const newState = !currentPermittedState;
    const filtered = userPermissions.filter(p => p.folder_id !== folderId);
    
    // We add an explicit record for this folder whether it's true or false,
    // so it properly overrides any inheritance from parents.
    const newPermissions = [...filtered, { folder_id: folderId, can_manage: newState, include_subfolders: true }];

    // 2. Update state optimistically
    setUserPermissions(newPermissions);

    // 3. Save to backend
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPermissions }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('อัปเดตสิทธิ์สำเร็จ');
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสิทธิ์');
    }
  };



  const renderFolderTree = (parentId: string | null) => {
    if (!parentId) return null;
    const rootChildren = folders.filter((f: any) => f.parents?.[0] === parentId);
    
    if (rootChildren.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rootChildren.map((child: any) => (
          <FolderNode 
            key={child.id}
            folder={child} 
            folders={folders} 
            userPermissions={userPermissions} 
            togglePermission={togglePermission} 
            depth={0} 
          />
        ))}
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
        <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          กำหนดสิทธิ์การจัดการโฟลเดอร์สำหรับ <b>Admin และผู้ช่วย</b> ทุกคนในระบบ<br/>
          (เมื่อเลื่อนเปิดสิทธิ์ ระบบจะบันทึกให้อัตโนมัติ และสิทธิ์นั้นจะ<b>ครอบคลุมโฟลเดอร์ย่อยทั้งหมดที่อยู่ภายในด้วยเสมอ</b>)
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          {loadingFolders ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดโครงสร้างโฟลเดอร์...</div>
          ) : !rootFolderId ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>ยังไม่มีการตั้งค่าโฟลเดอร์หลักในระบบ</div>
          ) : (
            renderFolderTree(rootFolderId)
          )}
        </div>
      </div>
    </div>
  );
}
