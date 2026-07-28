'use client';

import { useState, useEffect } from 'react';

interface DriveUrl {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: string;
}

export default function AdminPage() {
  const [urls, setUrls] = useState<DriveUrl[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUrls = async () => {
    try {
      const res = await fetch('/api/urls');
      if (res.ok) {
        const data = await res.json();
        setUrls(data);
      }
    } catch (err) {
      console.error('Failed to load URLs:', err);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถเพิ่มข้อมูลได้');
      }

      setSuccess('เพิ่มข้อมูลสำเร็จแล้ว!');
      setTitle('');
      setUrl('');
      setDescription('');
      fetchUrls();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบ URL นี้ใช่หรือไม่?')) return;

    try {
      const res = await fetch(`/api/urls?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUrls();
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div>
      <h1 className="page-title">จัดการข้อมูล Google Drive URL</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Form Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            เพิ่ม URL ใหม่
          </h2>

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

          <form onSubmit={handleAddUrl} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                ชื่อเรื่อง / กิจกรรม *
              </label>
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น กีฬาสีประจำปี 2569"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Google Drive URL *
              </label>
              <input
                type="url"
                className="input-field"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                รายละเอียดเพิ่มเติม
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับสื่อนี้"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </form>
        </div>

        {/* List Table Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            รายการ URL ที่บันทึกไว้ ({urls.length})
          </h2>

          {urls.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              ยังไม่มีข้อมูล Google Drive URL ในระบบ
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ชื่อเรื่อง</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>URL</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {urls.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.description && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary-light)', textDecoration: 'underline', fontSize: '0.875rem' }}
                        >
                          เปิด Google Drive
                        </a>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ color: 'var(--color-danger)', fontWeight: 500, fontSize: '0.875rem' }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
