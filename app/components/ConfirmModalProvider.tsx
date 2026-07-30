'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<(value: boolean) => void>();

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolver) resolver(value);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => handleClose(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="card animate-fade-in" 
            style={{ 
              maxWidth: '420px', width: '100%', padding: '2rem', textAlign: 'center', 
              backgroundColor: 'white', borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>
              {options.title}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              {options.message}
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row' }}>
              <button 
                onClick={() => handleClose(false)}
                className="btn"
                style={{ flex: 1, backgroundColor: 'var(--color-bg-main)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
              >
                {options.cancelText || 'ยกเลิก'}
              </button>
              <button 
                onClick={() => handleClose(true)}
                className="btn btn-primary"
                style={options.danger ? { flex: 1, background: 'var(--color-danger)', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' } : { flex: 1 }}
              >
                {options.confirmText || 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmModalProvider');
  }
  return context;
};
