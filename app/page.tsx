'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DriveUrl {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: string;
}

export default function Home() {
  const [urls, setUrls] = useState<DriveUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/urls')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUrls(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
          <h1 className="page-title">สื่อและกิจกรรมทั้งหมด</h1>
          
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)' }}>กำลังโหลดข้อมูล...</p>
          ) : urls.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>ยังไม่มีรายการสื่อในขณะนี้</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {urls.map((item) => (
                <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ width: '100%', height: '180px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 500 }}>
                      📷 Google Drive Media
                    </div>
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                      {item.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    เปิดดูใน Google Drive ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
