'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';
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
                  <li key={u.email} className="user-list-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                    
                    {/* Top: Info Stack */}
                    <div className="user-info-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                      
                      {/* Line 1: Name or Email */}
                      <div className="user-name-line" style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)', wordBreak: 'break-word' }}>
                        {u.first_name ? `${u.title || ''}${u.first_name} ${u.last_name || ''}` : u.email}
                      </div>

                      {/* Line 2: Subject */}
                      {u.subject_group && (
                        <div className="user-subject-line" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', wordBreak: 'break-word' }}>
                          กลุ่มสาระฯ: {u.subject_group}
                        </div>
                      )}

                      {/* Line 3: Email (if name exists) */}
                      {u.first_name && (
                        <div className="user-email-line" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                          อีเมล: {u.email}
                        </div>
                      )}

                      {/* Line 4: Status */}
                      <div className="user-status-line" style={{ fontSize: '0.75rem', fontWeight: 500, color: u.is_onboarded ? 'var(--color-success)' : 'orange' }}>
                        {u.is_onboarded ? 'กรอกข้อมูลแล้ว' : 'รอเข้าสู่ระบบครั้งแรก'}
                      </div>
                    </div>
                    
                    {/* Bottom: Actions (Role Dropdown + Delete) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '0.25rem' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleEditRole(u.email, e.target.value)}
                        className="input-field user-role-select"
                        disabled={isMasterAdmin}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 'auto', borderRadius: '1rem', backgroundColor: isSuperadmin ? 'var(--color-primary-light)' : '#f3f4f6', color: isSuperadmin ? 'var(--color-primary)' : '#4b5563', border: 'none', fontWeight: 600, cursor: isMasterAdmin ? 'not-allowed' : 'pointer', opacity: isMasterAdmin ? 0.7 : 1 }}
                      >
                        { (session?.user?.email === 'ood.wirat2533@gmail.com' || isSuperadmin) && <option value="superadmin">Superadmin</option> }
                        <option value="admin">Admin</option>
                        <option value="assistant_admin">ผู้ช่วย Admin</option>
                      </select>

                      <button 
                        onClick={() => handleDeleteAdmin(u.email)}
                        style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="ลบผู้ใช้"
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
