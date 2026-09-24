/**
 * MediKiosk Senior Citizen / Elderly-Friendly Accessibility Assistant
 * - Large font & high-contrast mode toggle
 * - Text-To-Speech (TTS) Voice Read Aloud for older patients
 * - Emergency Helpline Quick Dialers
 */

(function () {
  // Apply saved senior mode preference immediately to prevent flash
  if (localStorage.getItem('medikiosk_senior_mode') === 'true') {
    document.documentElement.classList.add('senior-mode');
    if (document.body) document.body.classList.add('senior-mode');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('medikiosk_senior_mode') === 'true') {
      document.body.classList.add('senior-mode');
      updateSeniorToggleButtons(true);
    }

    // Auto-bind voice read buttons
    document.querySelectorAll('.voice-read-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-read-target');
        let text = '';
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) text = el.innerText;
        }
        if (!text) {
          text = btn.getAttribute('data-read-text') || btn.closest('.portal-card, .card')?.innerText || '';
        }
        if (text) {
          window.readTextAloud(text);
        }
      });
    });
  });

  window.toggleSeniorMode = function () {
    const isSenior = document.body.classList.toggle('senior-mode');
    document.documentElement.classList.toggle('senior-mode', isSenior);
    localStorage.setItem('medikiosk_senior_mode', isSenior ? 'true' : 'false');
    updateSeniorToggleButtons(isSenior);

    const announcement = isSenior
      ? 'Senior citizen mode activated. Text size and buttons enlarged.'
      : 'Standard mode activated.';
    window.readTextAloud(announcement);
  };

  function updateSeniorToggleButtons(isSenior) {
    document.querySelectorAll('.senior-toggle-btn').forEach((btn) => {
      if (isSenior) {
        btn.classList.add('btn-warning');
        btn.classList.remove('btn-outline-warning');
        btn.innerHTML = '<i class="bi bi-eyeglasses me-1"></i> Senior Mode: ON (बड़ा फॉन्ट)';
      } else {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-outline-warning');
        btn.innerHTML = '<i class="bi bi-eyeglasses me-1"></i> Senior Mode (बड़ा टेक्स्ट)';
      }
    });
  }

  window.readTextAloud = function (text, lang) {
    if (!('speechSynthesis' in window)) {
      alert('Audio read-aloud is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();

    // Clean up text for speech
    const cleanText = String(text || '')
      .replace(/[\u2022\u2192]/g, ' ')
      .replace(/UHID:[A-Z0-9-]+/gi, 'Universal Health ID')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 500));
    utterance.rate = 0.88; // Patient, clear pacing for senior listeners
    utterance.pitch = 1.0;

    const currentLang = lang || (document.documentElement.lang || 'en');
    if (currentLang === 'hi' || /[\u0900-\u097F]/.test(cleanText)) {
      utterance.lang = 'hi-IN';
    } else if (currentLang === 'bn' || /[\u0980-\u09FF]/.test(cleanText)) {
      utterance.lang = 'bn-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    window.speechSynthesis.speak(utterance);
  };
})();
