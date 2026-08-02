'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [title, setTitle] = useState('นาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [subjectGroup, setSubjectGroup] = useState('ภาษาไทย');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSession(data);
          // If already onboarded, send to home
          if (data.user?.isOnboarded) {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      })
      .catch((err) => console.error('Session fetch error:', err))
      .finally(() => setCheckingSession(false));
  }, [router]);

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null; // will be redirected
  }

  const email = session?.user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          firstName,
          lastName,
          subjectGroup,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save data');
      }

      // Reload the page to refresh session or redirect
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const subjects = [
    'ภาษาไทย',
    'คณิตศาสตร์',
    'วิทยาศาสตร์และเทคโนโลยี',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'สุขศึกษาและพลศึกษา',
    'ศิลปะ',
    'การงานอาชีพ',
    'ภาษาต่างประเทศ'
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
            กรอกข้อมูลส่วนตัว
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            สำหรับการเข้าสู่ระบบครั้งแรก
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="title" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              คำนำหน้าชื่อ
            </label>
            <select
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              required
            >
              <option value="นาย">นาย</option>
              <option value="นาง">นาง</option>
              <option value="นางสาว">นางสาว</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="firstName" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                ชื่อ
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
                placeholder="ชื่อของคุณ"
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="lastName" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                นามสกุล
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field"
                placeholder="นามสกุลของคุณ"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              อีเมล <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(ไม่สามารถแก้ไขได้)</span>
            </label>
            <input
              id="email"
              type="email"
              readOnly
              value={email}
              className="input-field"
              style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="subjectGroup" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              กลุ่มสาระการเรียนรู้
            </label>
            <select
              id="subjectGroup"
              value={subjectGroup}
              onChange={(e) => setSubjectGroup(e.target.value)}
              className="input-field"
              required
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
