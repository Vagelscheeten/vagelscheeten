'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';

export function KontaktSection() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | 'success' | 'error'>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ein Fehler ist aufgetreten');
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error: unknown) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-melsdorf-green/40 focus:border-melsdorf-green transition-colors text-sm';

  return (
    <SectionWrapper id="kontakt" bgColor="bg-melsdorf-beige/40">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 bg-white/70 rounded-full text-sm font-semibold text-melsdorf-orange shadow-sm mb-4">
            ✉️ Schreib uns
          </span>
          <h2
            className="font-bold text-slate-900 mb-3"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontFamily: 'var(--font-poppins)' }}
          >
            Kontakt
          </h2>
          <p className="text-slate-600 text-sm">
            Hast du Fragen zum Vogelschießen? Wir freuen uns über deine Nachricht.
          </p>
        </div>

        {/* Form card */}
        <motion.div
          className="bg-white rounded-3xl shadow-sm border border-white/80 p-4 sm:p-6 md:p-8"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Name
              </label>
              <input
                type="text" id="name" name="name"
                value={formData.name} onChange={handleChange}
                className={inputClass}
                placeholder="Dein Name" required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                E-Mail
              </label>
              <input
                type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                className={inputClass}
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Nachricht
              </label>
              <textarea
                id="message" name="message" rows={4}
                value={formData.message} onChange={handleChange}
                className={inputClass}
                placeholder="Deine Nachricht an uns" required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-melsdorf-green hover:bg-melsdorf-green/85 transition-colors text-white font-bold py-3.5 px-6 rounded-xl shadow-sm hover:shadow-md disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Wird gesendet…
                </>
              ) : (
                <>
                  Nachricht senden
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {submitStatus === 'success' && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
                <span className="mt-0.5">✅</span>
                <p className="font-medium">Vielen Dank! Wir melden uns so schnell wie möglich bei dir.</p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <p className="font-medium">{errorMessage || 'Bitte versuche es später erneut.'}</p>
              </div>
            )}
          </form>
        </motion.div>

      </div>
    </SectionWrapper>
  );
}
