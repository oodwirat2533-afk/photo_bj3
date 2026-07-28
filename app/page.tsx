'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DriveUrl {
  id: number;
  url: string;
  title: string;
  description?: string;
  created_at: string;
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
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div style={{ padding: '1.5rem', fontWeight: 700, fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🏫</span> School ERP
        </div>
        <nav style={{ padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none' }}>
            <li>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderLeft: '4px solid var(--color-primary-light)', fontWeight: 500 }}>
                <span>📁</span> โฟลเดอร์กิจกรรม
              </Link>
            </li>
            <li>
              <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', opacity: 0.75 }}>
                <span>🔒</span> ผู้ดูแลระบบ
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="top-header">
          <div style={{ fontWeight: 600, color: 'var(--color-primary-dark)', fontSize: '1.125rem' }}>
            ระบบคลังภาพและวิดีโอกิจกรรมโรงเรียน
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-main)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              มุมมองบุคคลทั่วไป / นักเรียน
            </span>
          </div>
        </header>

        <main className="content-area">
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>โฟลเดอร์กิจกรรมทั้งหมด</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              คลิกที่โฟลเดอร์กิจกรรมที่ต้องการเพื่อเปิดดูภาพและวิดีโอบน Google Drive
            </p>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
              กำลังโหลดโฟลเดอร์...
            </div>
          ) : urls.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>ยังไม่มีโฟลเดอร์ในขณะนี้</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ผู้ดูแลระบบยังไม่ได้เพิ่มโฟลเดอร์กิจกรรมในระบบ
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {urls.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.2s ease-in-out',
                    borderLeft: '4px solid var(--color-primary-light)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#eff6ff',
                        color: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        fontSize: '1.5rem',
                        flexShrink: 0
                      }}>
                        📁
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-primary-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Google Drive Folder
                        </span>
                      </div>
                    </div>

                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-muted)',
                      lineHeight: '1.5',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'orient-vertical',
                      overflow: 'hidden',
                      height: '2.6em'
                    }}>
                      {item.description || 'คลิกเพื่อเข้าชมภาพและวิดีโอกิจกรรม'}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-primary-light)'
                  }}>
                    <span>เปิดดูโฟลเดอร์</span>
                    <span>↗</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
