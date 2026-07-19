import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Onboarding.module.css';

interface OnboardingStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Onboarding({ isOpen, onClose }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const steps: OnboardingStep[] = [
    {
      target: '#workspace-header',
      title: 'Tu Lote Activo 📁',
      content: 'Aquí puedes ver el nombre del lote que estás editando. Si deseas cambiarle el nombre, haz clic sobre el texto (lápiz). También verás un tachito para eliminarlo.',
      placement: 'bottom'
    },
    {
      target: '#code-input-container',
      title: 'Ingreso de Códigos EAN-13 ✍️',
      content: 'Escribe el código EAN-13 de 12 o 13 dígitos y pulsa "Validar". También puedes autocompletar usando el modo Correlativo o escanear con la cámara.',
      placement: 'bottom'
    },
    {
      target: '#metadata-switches',
      title: 'Información Opcional 🏷️',
      content: 'Activa estos switches para añadir descripciones o precios a tus códigos. La tabla se adaptará y el PDF final los incluirá automáticamente.',
      placement: 'bottom'
    },
    {
      target: '#save-actions-container',
      title: 'Guardado de Cambios 💾',
      content: 'Por seguridad, tus personalizaciones no se autoguardan en caliente. Recuerda presionar "Guardar Cambios" para subir tus progresos a la nube.',
      placement: 'top'
    },
    {
      target: typeof window !== 'undefined' && window.innerWidth <= 768 ? '#floating-settings-btn' : '#pdf-settings-panel',
      title: 'Ajustes de Diseño e Impresión ⚙️',
      content: 'Configura tamaños, fuentes, alineaciones y márgenes para tus códigos de barras. Cuando estés listo, haz clic en "Descargar PDF" para exportar etiquetas listas para imprimir.',
      placement: typeof window !== 'undefined' && window.innerWidth <= 768 ? 'top' : 'left'
    },
    {
      target: typeof window !== 'undefined' && window.innerWidth <= 1024 ? '#mobile-menu-btn' : '#sidebar-batch-list',
      title: 'Mis Lotes Guardados 📚',
      content: 'En esta sección encontrarás todos tus lotes guardados en tu cuenta. Puedes alternar entre ellos para cargarlos y seguir trabajando al instante.',
      placement: typeof window !== 'undefined' && window.innerWidth <= 1024 ? 'top' : 'right'
    }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      if (!step) return;

      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Comprobar si el elemento es visible y tiene dimensiones reales
        if (rect.width > 0 && rect.height > 0) {
          // Agregar un pequeño padding al spotlight
          const padding = 6;
          const newRect = {
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2
          };
          setSpotlightRect(newRect);

          // Calcular posición de tooltip
          const isMobile = window.innerWidth <= 768;
          if (isMobile) {
            // En móvil, forzar posición fija en la parte inferior para evitar overflow lateral
            setTooltipStyle({
              position: 'fixed',
              bottom: '20px',
              left: '12px',
              right: '12px',
              width: 'auto',
              maxWidth: 'none',
              zIndex: 10002,
              transform: 'none'
            });
          } else {
            // Posicionar relative al elemento en desktop
            const gap = 12;
            let top = 0;
            let left = 0;
            let transform = '';

            const tooltipWidth = 320; // Max width aproximado
            const tooltipHeight = 180; // Altura aproximada

            if (step.placement === 'bottom') {
              top = newRect.top + newRect.height + gap;
              left = newRect.left + newRect.width / 2;
              transform = 'translateX(-50%)';
            } else if (step.placement === 'top') {
              top = newRect.top - tooltipHeight - gap;
              left = newRect.left + newRect.width / 2;
              transform = 'translateX(-50%)';
            } else if (step.placement === 'left') {
              top = newRect.top + newRect.height / 2;
              left = newRect.left - tooltipWidth - gap;
              transform = 'translateY(-50%)';
            } else if (step.placement === 'right') {
              top = newRect.top + newRect.height / 2;
              left = newRect.left + newRect.width + gap;
              transform = 'translateY(-50%)';
            } else {
              // Center fallback
              setTooltipStyle({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10002
              });
              return;
            }

            // Validar límites de la pantalla para evitar desborde
            if (left - tooltipWidth / 2 < 10) left = tooltipWidth / 2 + 10;
            if (left + tooltipWidth / 2 > window.innerWidth - 10) left = window.innerWidth - tooltipWidth / 2 - 10;
            if (top < 10) top = newRect.top + newRect.height + gap;

            setTooltipStyle({
              position: 'fixed',
              top: `${top}px`,
              left: `${left}px`,
              transform,
              zIndex: 10002
            });
          }
          return;
        }
      }

      // Fallback si no encuentra el elemento (centrar tooltip tipo Modal en pantalla)
      setSpotlightRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: window.innerWidth <= 768 ? 'calc(100% - 24px)' : '350px',
        zIndex: 10002
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    // Timer para recalcular por si cargan componentes dinámicos
    const timer = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearTimeout(timer);
    };
  }, [isOpen, currentStep, mounted]);

  if (!isOpen || !mounted) return null;

  const stepData = steps[currentStep];
  if (!stepData) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('izicode_onboarding_completed', 'true');
    onClose();
  };

  return createPortal(
    <div className={styles.onboardingOverlay}>
      {/* Fondo oscuro para spotlight */}
      {spotlightRect ? (
        <div 
          className={styles.spotlight} 
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`
          }}
        />
      ) : (
        <div className={styles.fullOverlay} />
      )}

      {/* Tooltip Card con contenido de Onboarding */}
      <div className={styles.tooltipCard} style={tooltipStyle}>
        <div className={styles.cardHeader}>
          <h4 className={styles.title}>{stepData.title}</h4>
          <button className={styles.closeBtn} onClick={handleComplete} aria-label="Cerrar guía">&times;</button>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.description}>{stepData.content}</p>
        </div>
        <div className={styles.cardFooter}>
          <button className={styles.skipBtn} onClick={handleComplete}>Omitir</button>
          
          <div className={styles.navigation}>
            <div className={styles.progressText}>
              {currentStep + 1} de {steps.length}
            </div>
            
            <div className={styles.actions}>
              {currentStep > 0 && (
                <button className={styles.prevBtn} onClick={handlePrev}>
                  Anterior
                </button>
              )}
              <button className={styles.nextBtn} onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Entendido' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
