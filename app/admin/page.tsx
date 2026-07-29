'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { Lock, LogOut, ShieldAlert, ArrowLeft, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin Management State
  const [users, setUsers] = useState<any[]>([]);
  const [masterAdmins, setMasterAdmins] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [adminLoading, setAdminLoading] = useState(false);

  // Auth & Modal State
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // 1. Fetch Session & Current URL
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
          
          if (data.user?.isAdmin) {
            Promise.all([
              fetch('/api/urls').then(res => res.json()),
              // If superadmin, fetch all users from the new API
              data.user?.role === 'superadmin' ? fetch('/api/users').then(res => res.json()) : Promise.resolve(null)
            ])
              .then(([urlData, userData]) => {
                if (urlData && urlData.url) setUrl(urlData.url);
                if (userData && userData.users) {
                  setUsers(userData.users);
                  // We don't strictly need masterAdmins from API if we just protect delete
                }
              })
              .catch((err) => console.error('Failed to fetch data:', err))
              .finally(() => setFetching(false));
          } else {
            setFetching(false);
          }
        } else {
          setFetching(false);
        }
      })
      .catch((err) => console.error('Session fetch error:', err))
      .finally(() => setCheckingSession(false));
  }, []);

  const handleUpdateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      setSuccess('บันทึกโฟลเดอร์หลักสำเร็จแล้ว! นักเรียนจะเห็นโฟลเดอร์นี้ในหน้าหลัก');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      
      // Refresh user list
      const fetchRes = await fetch('/api/users');
      const fetchData = await fetchRes.json();
      if (fetchData.users) {
        setUsers(fetchData.users);
      }
      
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

  if (checkingSession || (session?.user?.isAdmin && fetching)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // State 1: NOT LOGGED IN
  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--color-primary-light)', borderRadius: '50%', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
            <Lock size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>ระบบผู้ดูแลระบบ</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            กรุณาเข้าสู่ระบบด้วยบัญชี Google ของแอดมินเพื่อจัดการข้อมูลคลังภาพ
          </p>

          <button 
            onClick={() => signIn('google')} 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.75rem' }}
          >
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.415 0-6.19-2.775-6.19-6.19s2.775-6.19 6.19-6.19c1.693 0 3.2.678 4.302 1.78l3.14-3.14A10.36 10.36 0 0 0 12.24 2c-5.714 0-10.24 4.526-10.24 10.24s4.526 10.24 10.24 10.24c5.395 0 9.8-3.924 9.8-10.24 0-.647-.058-1.258-.17-1.955H12.24z"/>
            </svg>
            Sign in with Google
          </button>

          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // State 2: LOGGED IN BUT NOT ADMIN
  if (!session.user?.isAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center', padding: '2.5rem', borderTop: '4px solid var(--color-danger)' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--color-danger-bg)', borderRadius: '50%', color: 'var(--color-danger)', marginBottom: '1.5rem' }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>ปฏิเสธการเข้าถึง</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            บัญชีของคุณไม่มีสิทธิ์เข้าใช้งานระบบนี้ 
          </p>
          <div style={{ backgroundColor: 'var(--color-background)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'monospace', marginBottom: '2rem' }}>
            {session.user?.email}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setShowConfirmLogout(true)} 
              className="btn" 
              style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <LogOut size={16} /> ออกจากระบบ
            </button>
            <Link href="/" className="btn btn-primary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {/* Logout Modal */}
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
                คุณต้องการออกจากระบบและกลับไปที่หน้าหลักใช่หรือไม่?
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

  const roleLabels: Record<string, string> = {
    'superadmin': 'Superadmin',
    'admin': 'Admin',
    'assistant_admin': 'ผู้ช่วย Admin'
  };

  // State 3: LOGGED IN & IS ADMIN
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>ตั้งค่าระบบคลังภาพ</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
            <p style={{ fontWeight: 600 }}>{session.user.name}</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{session.user.email} ({roleLabels[session.user.role] || 'Admin'})</p>
          </div>
          <button 
            onClick={() => setShowConfirmLogout(true)} 
            className="btn" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
          >
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          ลิงก์โฟลเดอร์ Google Drive หลัก
        </h2>
        
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          กรอกลิงก์โฟลเดอร์ Google Drive หลักเพียงลิงก์เดียว ระบบจะแสดงโฟลเดอร์ย่อยทั้งหมดที่อยู่ในลิงก์นี้ให้นักเรียนดูในหน้าหลักโดยอัตโนมัติ
        </p>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleUpdateUrl} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Google Drive Folder URL
            </label>
            <input
              type="url"
              className="input-field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกลิงก์โฟลเดอร์'}
          </button>
        </form>
      </div>

      {/* Admin Management Section - ONLY FOR SUPERADMIN */}
      {session.user.role === 'superadmin' && (
        <div className="card" style={{ maxWidth: '600px', marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} /> จัดการผู้ดูแลระบบ
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
              {session?.user?.email === 'ood.wirat2533@gmail.com' && (
                <option value="superadmin">Superadmin</option>
              )}
              <option value="admin">Admin</option>
              <option value="assistant_admin">ผู้ช่วย Admin</option>
            </select>
            <button type="submit" className="btn btn-primary" disabled={adminLoading} style={{ flex: '0 0 auto' }}>
              {adminLoading ? 'กำลังเพิ่ม...' : 'เพิ่มผู้ใช้'}
            </button>
          </form>

          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              รายชื่อผู้ใช้งานในระบบ
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.filter(u => u.email !== session.user.email).map((u) => {
                const isSuperadmin = u.role === 'superadmin';
                return (
                  <li key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 500 }}>{u.email}</span>
                        
                        <select
                          value={u.role}
                          onChange={(e) => handleEditRole(u.email, e.target.value)}
                          className="input-field"
                          style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem', height: 'auto', borderRadius: '1rem', backgroundColor: isSuperadmin ? 'var(--color-primary-light)' : '#f3f4f6', color: isSuperadmin ? 'var(--color-primary)' : '#4b5563', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {session?.user?.email === 'ood.wirat2533@gmail.com' && (
                            <option value="superadmin">Superadmin</option>
                          )}
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
                        style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
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
              คุณต้องการออกจากระบบและกลับไปที่หน้าหลักใช่หรือไม่?
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
