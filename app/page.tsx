import Link from 'next/link';

export default function Home() {
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div style={{ padding: '1.5rem', fontWeight: 700, fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          School Media ERP
        </div>
        <nav style={{ padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none' }}>
            <li>
              <Link href="/" style={{ display: 'block', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderLeft: '4px solid var(--color-primary-light)' }}>
                สื่อทั้งหมด
              </Link>
            </li>
            <li>
              <Link href="/login" style={{ display: 'block', padding: '0.75rem 1.5rem', opacity: 0.7 }}>
                ผู้ดูแลระบบ
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <header className="top-header">
          <div style={{ fontWeight: 600 }}>ดูภาพและวิดีโอจากกิจกรรมโรงเรียน</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>มุมมองบุคคลทั่วไป</span>
          </div>
        </header>

        <main className="content-area">
          <h1 className="page-title">สื่อล่าสุด</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Example Card 1 */}
            <div className="card">
              <div style={{ width: '100%', height: '200px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#94a3b8' }}>[ พื้นที่แสดงรูป/วิดีโอ ]</span>
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>กิจกรรมกีฬาสี 2569</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                อัลบั้มรวมภาพกิจกรรมกีฬาสีประจำปี
              </p>
              <a href="#" className="btn btn-primary" style={{ width: '100%' }}>
                เปิดดูใน Google Drive
              </a>
            </div>

            {/* Example Card 2 */}
            <div className="card">
              <div style={{ width: '100%', height: '200px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#94a3b8' }}>[ พื้นที่แสดงรูป/วิดีโอ ]</span>
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>พิธีไหว้ครู</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                วิดีโอบันทึกภาพพิธีไหว้ครู
              </p>
              <a href="#" className="btn btn-primary" style={{ width: '100%' }}>
                เปิดดูใน Google Drive
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
