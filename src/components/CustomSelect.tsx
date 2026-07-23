import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  id: string;
  name: string;
  type?: string; // '1D' o '2D'
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  style
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.id === value);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        fontFamily: 'var(--font-body, inherit)',
        ...style
      }}
    >
      {/* Botón Disparador */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: disabled ? 'var(--background-secondary, #f1f5f9)' : 'var(--card-bg, #ffffff)',
          color: disabled ? 'var(--text-muted, #94a3b8)' : 'var(--text-color, #1e293b)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          outline: 'none',
          boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--primary-color, #4f46e5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-shadow, rgba(79, 70, 229, 0.15))';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {selectedOption ? (
            <>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOption.name}
              </span>
              {selectedOption.type && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    backgroundColor: selectedOption.type === '2D' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                    color: selectedOption.type === '2D' ? 'var(--success-color, #10b981)' : 'var(--primary-color, #4f46e5)',
                    flexShrink: 0
                  }}
                >
                  {selectedOption.type}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{placeholder}</span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: 'var(--text-secondary, #475569)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: '8px'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Lista Desplegable */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
            zIndex: 999,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px',
            animation: 'slideDown 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .custom-select-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-select-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-select-scrollbar::-webkit-scrollbar-thumb {
              background-color: var(--border-color, #e2e8f0);
              border-radius: 3px;
            }
          `}</style>
          <div className="custom-select-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'var(--hover-bg, rgba(79, 70, 229, 0.08))' : 'transparent',
                    color: isSelected ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 400,
                    textAlign: 'left',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background-color 0.15s ease, color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--background-secondary, #f1f5f9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                    {option.name}
                  </span>
                  {option.type && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1.5px 5px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        backgroundColor: option.type === '2D' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                        color: option.type === '2D' ? 'var(--success-color, #10b981)' : 'var(--primary-color, #4f46e5)',
                        flexShrink: 0
                      }}
                    >
                      {option.type}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
