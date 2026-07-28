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

// Helper to convert Google Drive URL to embeddable preview link
function getEmbedUrl(url: string): { embedUrl: string | null; isFolder: boolean } {
  try {
    // Check if folder
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
      return {
        embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`,
        isFolder: true,
      };
    }

    // Check if file (view/preview/edit)
    const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
      return {
        embedUrl: `https://drive.google.com/file/d/${fileMatch[1]}/preview`,
        isFolder: false,
      };
    }

    return { embedUrl: null, isFolder: false };
  } catch {
    return { embedUrl: null, isFolder: false };
  }
}

export default function Home() {
  const [urls, setUrls] = useState<DriveUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreview, setActivePreview] = useState<{ title: string; embedUrl: string } | null>(null);

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
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ padding: '1.5rem', fontWeight: 700, fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🏫</span> School Media ERP
        </div>
        <nav style={{ padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none' }}>
            <li>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderLeft: '4px solid var(--color-primary-light)', fontWeight: 500 }}>
                <span>📁</span> สื่อทั้งหมด
              </Link>
            </li>
            <li>
              <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', opacity: 0.75, transition: 'opacity 0.2s' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>กิจกรรมล่าสุด</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                เลือกกิจกรรมเพื่อชมภาพและวิดีโอบน Google Drive
              </p>
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
              กำลังโหลดรายการสื่อ...
            </div>
          ) : urls.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>ยังไม่มีรายการสื่อในขณะนี้</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ผู้ดูแลระบบสามารถเข้าสู่ระบบเพื่อเพิ่ม URL ของ Google Drive ได้ตลอดเวลา
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {urls.map((item) => {
                const { embedUrl, isFolder } = getEmbedUrl(item.url);
                return (
                  <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                    <div>
                      <div style={{ width: '100%', height: '180px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', position: 'relative', overflow: 'hidden' }}>
                        {embedUrl ? (
                          <iframe
                            src={embedUrl}
                            style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                            title={item.title}
                          />
                        ) : (
                          <>
                            <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{isFolder ? '🖼️' : '🎬'}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Google Drive Media</span>
                          </>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        {item.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {embedUrl && (
                        <button
                          onClick={() => setActivePreview({ title: item.title, embedUrl })}
                          className="btn"
                          style={{ flex: 1, backgroundColor: 'var(--color-bg-main)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
                        >
                          👁️ แสดงตัวอย่าง
                        </button>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        เปิดใน Drive ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal Preview */}
      {activePreview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '900px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{activePreview.title}</h3>
              <button
                onClick={() => setActivePreview(null)}
                style={{ fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flexGrow: 1, backgroundColor: '#f8fafc' }}>
              <iframe
                src={activePreview.embedUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
