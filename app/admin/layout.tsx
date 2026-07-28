import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div style={{ padding: '1.5rem', fontWeight: 700, fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          School ERP (Admin)
        </div>
        <nav style={{ padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none' }}>
            <li>
              <Link href="/admin" style={{ display: 'block', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderLeft: '4px solid var(--color-primary-light)' }}>
                จัดการ URL สื่อ
              </Link>
            </li>
            <li>
              <Link href="/" style={{ display: 'block', padding: '0.75rem 1.5rem', opacity: 0.7 }}>
                กลับสู่หน้าแรก
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <header className="top-header">
          <div style={{ fontWeight: 600 }}>ระบบจัดการข้อมูล Google Drive URL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin User</span>
            <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
              A
            </div>
          </div>
        </header>

        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
