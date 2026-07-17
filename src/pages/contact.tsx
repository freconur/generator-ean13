import React, { useState } from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import styles from '@/styles/Contact.module.css';

interface FormFields {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactPage() {
  const [fields, setFields] = useState<FormFields>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormFields, boolean>>({
    name: false,
    email: false,
    subject: false,
    message: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateField = (name: keyof FormFields, value: string): string => {
    if (!value.trim()) {
      return 'Este campo es obligatorio';
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Ingresa un correo electrónico válido';
      }
    }
    if (name === 'message' && value.trim().length < 10) {
      return 'El mensaje debe tener al menos 10 caracteres';
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormFields;
    setFields((prev) => ({ ...prev, [fieldName]: value }));

    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormFields;
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    const newTouched = { name: true, email: true, subject: true, message: true };

    Object.keys(fields).forEach((key) => {
      const fieldName = key as keyof FormFields;
      const error = validateField(fieldName, fields[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      
      // Simular envío de formulario con retraso ficticio
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
      }, 2000);
    }
  };

  const handleReset = () => {
    setFields({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    setErrors({});
    setTouched({
      name: false,
      email: false,
      subject: false,
      message: false,
    });
    setIsSuccess(false);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Contacto | izicode</title>
        <meta name="description" content="Ponte en contacto con el equipo de soporte técnico y comercial de izicode. Estamos aquí para ayudarte con la generación de tus códigos de barras EAN-13." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>Ponte en Contacto</h1>
          <p className={styles.subtitle}>
            ¿Tienes alguna pregunta, sugerencia o necesitas soporte? Escríbenos y nuestro equipo te responderá lo antes posible.
          </p>
        </div>

        <div className={styles.contactLayout}>
          {/* Tarjetas laterales de contacto alternativo */}
          <div className={styles.infoSection}>
            {/* Tarjeta de Soporte WhatsApp */}
            <div className={`${styles.infoCard} ${styles.whatsapp}`}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Soporte por WhatsApp</h3>
                <p className={styles.cardText}>
                  ¿Buscas una respuesta inmediata? Conversa directamente con nuestro equipo de soporte técnico en tiempo real.
                </p>
                <a 
                  href="https://wa.me/51999999999?text=Hola,%20tengo%20una%20pregunta%20sobre%20izicode" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.actionLink}
                >
                  Iniciar chat de WhatsApp
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Tarjeta de Soporte por Correo */}
            <div className={styles.infoCard}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Correo Electrónico</h3>
                <p className={styles.cardText}>
                  Para consultas comerciales, reportes de fallos detallados o propuestas de colaboración, escríbenos directamente.
                </p>
                <a href="mailto:soporte@izicode.com" className={styles.actionLink}>
                  soporte@izicode.com
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Formulario de Contacto en Contenedor Glassmorphism */}
          <div className={styles.formSection}>
            {!isSuccess ? (
              <>
                <h2 className={styles.formTitle}>Enviar un Mensaje</h2>
                <form onSubmit={handleSubmit} className={styles.contactForm} noValidate>
                  <div className={styles.formRow}>
                    {/* Campo Nombre */}
                    <div className={styles.formGroup}>
                      <label htmlFor="name" className={styles.label}>Nombre completo *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={fields.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`${styles.input} ${touched.name && errors.name ? styles.inputError : ''}`}
                        placeholder="Ej. Juan Pérez"
                        disabled={isSubmitting}
                        required
                      />
                      {touched.name && errors.name && (
                        <span className={styles.errorMessage}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.name}
                        </span>
                      )}
                    </div>

                    {/* Campo Correo Electrónico */}
                    <div className={styles.formGroup}>
                      <label htmlFor="email" className={styles.label}>Correo electrónico *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={fields.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`${styles.input} ${touched.email && errors.email ? styles.inputError : ''}`}
                        placeholder="juan@correo.com"
                        disabled={isSubmitting}
                        required
                      />
                      {touched.email && errors.email && (
                        <span className={styles.errorMessage}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campo Asunto */}
                  <div className={styles.formGroup}>
                    <label htmlFor="subject" className={styles.label}>Asunto *</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={fields.subject}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`${styles.input} ${touched.subject && errors.subject ? styles.inputError : ''}`}
                      placeholder="Ej. Duda sobre suscripción Pro"
                      disabled={isSubmitting}
                      required
                    />
                    {touched.subject && errors.subject && (
                      <span className={styles.errorMessage}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {errors.subject}
                      </span>
                    )}
                  </div>

                  {/* Campo Mensaje */}
                  <div className={styles.formGroup}>
                    <label htmlFor="message" className={styles.label}>Mensaje *</label>
                    <textarea
                      id="message"
                      name="message"
                      value={fields.message}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`${styles.textarea} ${touched.message && errors.message ? styles.inputError : ''}`}
                      placeholder="Escribe tu mensaje aquí..."
                      disabled={isSubmitting}
                      required
                    />
                    {touched.message && errors.message && (
                      <span className={styles.errorMessage}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {errors.message}
                      </span>
                    )}
                  </div>

                  {/* Botón Enviar */}
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className={styles.spinner} />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Mensaje'
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Mensaje de Éxito Animado */
              <div className={styles.successContainer}>
                <div className={styles.successIconWrapper}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>¡Mensaje Enviado!</h2>
                <p className={styles.successText}>
                  Gracias por ponerte en contacto con izicode. Hemos recibido tu mensaje correctamente y nos comunicaremos contigo a la brevedad posible.
                </p>
                <button 
                  onClick={handleReset} 
                  className={styles.resetButton}
                >
                  Enviar otro mensaje
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <AuthModal />
    </div>
  );
}
