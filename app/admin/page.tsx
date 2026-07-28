'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { Lock, LogOut, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
            fetch('/api/urls')
              .then((res) => res.json())
              .then((urlData) => {
                if (urlData && urlData.url) {
                  setUrl(urlData.url);
                }
              })
              .catch((err) => console.error('Failed to fetch URL:', err))
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

  // State 3: LOGGED IN & IS ADMIN
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>ตั้งค่าโฟลเดอร์ Google Drive หลัก</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
            <p style={{ fontWeight: 600 }}>{session.user.name}</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{session.user.email}</p>
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
          ลิงก์โฟลเดอร์คลังภาพโรงเรียน
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
