'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Settings, Users, Image as ImageIcon, Menu, X, Folder } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Fetch session on mount & handle click outside dropdown
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
        }
      })
      .catch((err) => console.error('Session fetch error:', err));

    const handleMouseDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.settings-dropdown-container')) {
        setIsSettingsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const handleConfirmLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const roleLabels: Record<string, string> = {
    'superadmin': 'Superadmin',
    'admin': 'Admin',
    'assistant_admin': 'ผู้ช่วย Admin'
  };

  const isSuperadmin = session?.user?.role === 'superadmin';
  const isSettingsPage = pathname?.startsWith('/settings') || false;


  const navLinks = [
    ...(isSettingsPage ? [{ href: '/', label: 'หน้าแรก', icon: <ImageIcon size={18} /> }] : []),
    ...(isSuperadmin ? [
      { href: '/settings/drive', label: 'จัดการลิงก์ Google Drive', icon: <Settings size={18} /> },
      { href: '/settings/users', label: 'จัดการผู้ดูแลระบบ', icon: <Users size={18} /> },
      { href: '/settings/folders', label: 'จัดการโฟลเดอร์ที่แสดง', icon: <Folder size={18} /> }
    ] : [])
  ];

  return (
    <>
      <nav style={{ backgroundColor: 'var(--color-surface-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', height: '64px' }}>
            {/* Left side: Logo & Desktop Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #60a5fa, #2563eb)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                  <ImageIcon size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>School Photo Hub</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', marginTop: '2px' }}>พัฒนาโดย ครูวิรัตน์ ธีรพิพัฒนปัญญา</span>
                </div>
              </div>
              
              {/* Desktop menu moved to right side */}
            </div>

            {/* Right side: Auth */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="desktop-auth" style={{ display: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  {session?.user ? (
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>{session.user.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 500, lineHeight: 1.2 }}>{roleLabels[session.user.role] || 'Admin'}</span>
                    </div>
                  ) : null}

                  {/* Desktop Menu */}
                  <div className="desktop-menu" style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                    {pathname && pathname !== '/' && pathname.startsWith('/settings') && (
                      <Link 
                        href="/"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                          textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary-light)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      >
                        <ImageIcon size={18} /> หน้าแรก
                      </Link>
                    )}
                    
                    {session?.user && (
                      <>
                        {isSuperadmin ? (
                          <div className="settings-dropdown-container" style={{ position: 'relative' }}>
                            <button 
                              onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                                fontSize: '0.875rem', fontWeight: 500,
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary-light)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                            >
                              <Settings size={18} /> ตั้งค่าระบบ
                            </button>

                            {isSettingsDropdownOpen && (
                              <div 
                                style={{
                                  position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                                  backgroundColor: 'white', borderRadius: 'var(--radius-md)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid var(--color-border)',
                                  minWidth: '220px', zIndex: 100, display: 'flex', flexDirection: 'column',
                                  padding: '0.5rem'
                                }}
                              >
                                <Link 
                                  href="/settings/drive"
                                  onClick={() => setIsSettingsDropdownOpen(false)}
                                  style={{
                                    padding: '0.75rem 1rem', textDecoration: 'none', fontSize: '0.875rem',
                                    color: 'var(--color-text)', borderRadius: 'var(--radius-sm)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Settings size={16} /> จัดการลิงก์ Google Drive
                                </Link>
                                <Link 
                                  href="/settings/users"
                                  onClick={() => setIsSettingsDropdownOpen(false)}
                                  style={{
                                    padding: '0.75rem 1rem', textDecoration: 'none', fontSize: '0.875rem',
                                    color: 'var(--color-text)', borderRadius: 'var(--radius-sm)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Users size={16} /> จัดการผู้ดูแลระบบ
                                </Link>
                                <Link 
                                  href="/settings/folders"
                                  onClick={() => setIsSettingsDropdownOpen(false)}
                                  style={{
                                    padding: '0.75rem 1rem', textDecoration: 'none', fontSize: '0.875rem',
                                    color: 'var(--color-text)', borderRadius: 'var(--radius-sm)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Folder size={16} /> จัดการโฟลเดอร์ที่แสดง
                                </Link>
                                <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }}></div>

                                <button
                                  onClick={() => {
                                    setIsSettingsDropdownOpen(false);
                                    setShowConfirmLogout(true);
                                  }}
                                  style={{
                                    padding: '0.75rem 1rem', fontSize: '0.875rem',
                                    color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    border: 'none', background: 'none', cursor: 'pointer',
                                    width: '100%', textAlign: 'left'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <LogOut size={16} /> ออกจากระบบ
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowConfirmLogout(true)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-danger-bg)',
                              backgroundColor: '#fef2f2',
                              fontSize: '0.875rem', fontWeight: 500,
                              color: 'var(--color-danger)',
                              cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--color-danger)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.borderColor = 'var(--color-danger-bg)'; }}
                          >
                            <LogOut size={18} /> ออกจากระบบ
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {!session?.user && (
                    <button 
                      onClick={() => signIn('google', { callbackUrl: '/' })}
                      className="btn btn-glow"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem', borderRadius: '2rem' }}
                    >
                      <span style={{ color: '#fcd34d', fontSize: '1rem' }}>🔒</span> ลงชื่อเข้าใช้ ADMIN
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="mobile-menu-btn" style={{ display: 'flex', alignItems: 'center' }}>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: 'var(--color-text)' }}
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      if (link.href === '/' && pathname === '/') {
                        e.preventDefault();
                        window.dispatchEvent(new Event('go-home'));
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                      textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
                      backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    {link.icon} {link.label}
                  </Link>
                );
              })}
              
              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.5rem 0' }}></div>
              
              {session?.user ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{session.user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>{roleLabels[session.user.role] || 'Admin'}</div>
                  </div>
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); setShowConfirmLogout(true); }}
                    className="btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: '#fef2f2', color: 'var(--color-danger)', border: 'none' }}
                  >
                    <LogOut size={16} /> ออกจากระบบ
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                  className="btn btn-glow"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', width: '100%', borderRadius: '2rem' }}
                >
                  <span style={{ color: '#fcd34d', fontSize: '1.1rem' }}>🔒</span> ลงชื่อเข้าใช้ ADMIN
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Responsive styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          .desktop-menu { display: flex !important; gap: 0.5rem; }
          .desktop-auth { display: block !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}} />

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
            style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: 'var(--radius-lg)' }}
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
    </>
  );
}
