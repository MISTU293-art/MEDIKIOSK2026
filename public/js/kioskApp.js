/**
 * MediKiosk Interactive Kiosk Application Logic
 */
let currentStep = 1;
const totalSteps = 8;

const stepPayload = {
  demographics: {},
  chiefComplaint: { selectedOptions: [], duration: '', freeTextDescription: '' },
  hpi: { onset: 'gradual', progression: 'stable', severity: 5 },
  pastMedicalHistory: { selectedConditions: [] },
  allergies: { selectedAllergies: [] },
  medicationHistory: { currentMeds: [] },
  familyHistory: { selectedFamilyConditions: [] },
  personalHistory: { selectedHabits: [] }
};

let voiceAssistant = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Voice Assistant
  if (window.VoiceAssistant) {
    voiceAssistant = new window.VoiceAssistant({
      lang: window.kioskLang || 'en',
      onResult: (text) => {
        handleVoiceTranscript(text);
      }
    });

    voiceAssistant.onStateChange = (isRecording) => {
      const btn = document.getElementById('pushToTalkBtn');
      if (btn) {
        if (isRecording) {
          btn.classList.add('recording');
          btn.innerHTML = '<i class="bi bi-record-circle-fill"></i> Listening... Speak Now';
        } else {
          btn.classList.remove('recording');
          btn.innerHTML = '<i class="bi bi-mic-fill"></i> ' + (window.kioskStrings?.holdToSpeak || 'Hold to Speak');
        }
      }
    };
  }

  // Bind Push-to-Talk Mouse & Touch Events
  const pttBtn = document.getElementById('pushToTalkBtn');
  if (pttBtn && voiceAssistant) {
    // Mouse
    pttBtn.addEventListener('mousedown', () => voiceAssistant.startListening());
    pttBtn.addEventListener('mouseup', () => voiceAssistant.stopListening());
    pttBtn.addEventListener('mouseleave', () => voiceAssistant.stopListening());

    // Touch
    pttBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      voiceAssistant.startListening();
    });
    pttBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      voiceAssistant.stopListening();
    });
  }

  // Bind Repeat Audio
  const repeatBtn = document.getElementById('repeatAudioBtn');
  if (repeatBtn && voiceAssistant) {
    repeatBtn.addEventListener('click', () => {
      const activeStepTitle = document.querySelector('.step-card.active .step-title')?.innerText;
      const activeStepDesc = document.querySelector('.step-card.active .step-desc')?.innerText;
      const fullText = (activeStepTitle ? activeStepTitle + '. ' : '') + (activeStepDesc || '');
      if (fullText) voiceAssistant.speak(fullText);
    });
  }

  renderStep(1);
});

function toggleOption(card, categoryKey, optionValue, isMulti = false) {
  card.classList.toggle('selected');
  const isSelected = card.classList.contains('selected');

  if (categoryKey === 'chiefComplaint') {
    if (isSelected) {
      if (!stepPayload.chiefComplaint.selectedOptions.includes(optionValue)) {
        stepPayload.chiefComplaint.selectedOptions.push(optionValue);
      }
    } else {
      stepPayload.chiefComplaint.selectedOptions = stepPayload.chiefComplaint.selectedOptions.filter(x => x !== optionValue);
    }
  } else if (categoryKey === 'pastMedicalHistory') {
    if (isSelected) {
      if (!stepPayload.pastMedicalHistory.selectedConditions.includes(optionValue)) {
        stepPayload.pastMedicalHistory.selectedConditions.push(optionValue);
      }
    } else {
      stepPayload.pastMedicalHistory.selectedConditions = stepPayload.pastMedicalHistory.selectedConditions.filter(x => x !== optionValue);
    }
  } else if (categoryKey === 'allergies') {
    if (isSelected) {
      if (!stepPayload.allergies.selectedAllergies.includes(optionValue)) {
        stepPayload.allergies.selectedAllergies.push(optionValue);
      }
    } else {
      stepPayload.allergies.selectedAllergies = stepPayload.allergies.selectedAllergies.filter(x => x !== optionValue);
    }
  } else if (categoryKey === 'medicationHistory') {
    if (isSelected) {
      if (!stepPayload.medicationHistory.currentMeds.includes(optionValue)) {
        stepPayload.medicationHistory.currentMeds.push(optionValue);
      }
    } else {
      stepPayload.medicationHistory.currentMeds = stepPayload.medicationHistory.currentMeds.filter(x => x !== optionValue);
    }
  } else if (categoryKey === 'familyHistory') {
    if (isSelected) {
      if (!stepPayload.familyHistory.selectedFamilyConditions.includes(optionValue)) {
        stepPayload.familyHistory.selectedFamilyConditions.push(optionValue);
      }
    } else {
      stepPayload.familyHistory.selectedFamilyConditions = stepPayload.familyHistory.selectedFamilyConditions.filter(x => x !== optionValue);
    }
  } else if (categoryKey === 'personalHistory') {
    if (isSelected) {
      if (!stepPayload.personalHistory.selectedHabits.includes(optionValue)) {
        stepPayload.personalHistory.selectedHabits.push(optionValue);
      }
    } else {
      stepPayload.personalHistory.selectedHabits = stepPayload.personalHistory.selectedHabits.filter(x => x !== optionValue);
    }
  }
}

function selectSingleOption(card, categoryKey, fieldKey, optionValue) {
  const siblings = card.parentElement.querySelectorAll('.touch-option-card');
  siblings.forEach(el => el.classList.remove('selected'));
  card.classList.add('selected');
  if (categoryKey === 'chiefComplaint') {
    stepPayload.chiefComplaint[fieldKey] = optionValue;
  } else if (categoryKey === 'hpi') {
    stepPayload.hpi[fieldKey] = optionValue;
  }
}

function updatePainSlider(val) {
  stepPayload.hpi.severity = parseInt(val);
  const badge = document.getElementById('painScoreBadge');
  if (badge) badge.innerText = val + ' / 10';
}

function handleVoiceTranscript(text) {
  console.log('Voice recognized:', text);
  const voiceNotice = document.getElementById('voiceTranscriptNotice');
  if (voiceNotice) {
    voiceNotice.innerText = 'Transcribed: "' + text + '"';
    voiceNotice.style.display = 'block';
  }

  // If in chief complaint step, add to freeTextDescription
  if (currentStep === 2) {
    const existing = stepPayload.chiefComplaint.freeTextDescription || '';
    stepPayload.chiefComplaint.freeTextDescription = (existing ? existing + ' ' : '') + text;
    const input = document.getElementById('chiefComplaintFreeText');
    if (input) input.value = stepPayload.chiefComplaint.freeTextDescription;
  }
}

function renderStep(stepNumber) {
  currentStep = stepNumber;
  document.querySelectorAll('.step-card').forEach(el => el.classList.remove('active', 'd-block'));
  document.querySelectorAll('.step-card').forEach(el => el.classList.add('d-none'));

  const activeCard = document.getElementById('step_' + stepNumber);
  if (activeCard) {
    activeCard.classList.remove('d-none');
    activeCard.classList.add('active', 'd-block');
  }

  // Update Progress Bar
  const progressPercent = Math.round((stepNumber / totalSteps) * 100);
  const bar = document.getElementById('kioskProgressBar');
  if (bar) {
    bar.style.width = progressPercent + '%';
    bar.innerText = `Step ${stepNumber} of ${totalSteps} (${progressPercent}%)`;
  }

  // Nav Buttons
  const prevBtn = document.getElementById('prevStepBtn');
  const nextBtn = document.getElementById('nextStepBtn');
  const submitBtn = document.getElementById('submitIntakeBtn');

  if (prevBtn) prevBtn.style.visibility = stepNumber === 1 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.classList.toggle('d-none', stepNumber === totalSteps);
  if (submitBtn) submitBtn.classList.toggle('d-none', stepNumber !== totalSteps);

  // Read prompt audio automatically if available
  if (voiceAssistant) {
    const activeStepTitle = activeCard?.querySelector('.step-title')?.innerText;
    if (activeStepTitle) {
      voiceAssistant.speak(activeStepTitle);
    }
  }
}

function nextStep() {
  if (currentStep === 1) {
    // Validate Demographics
    const name = document.getElementById('input_fullName')?.value.trim();
    const age = document.getElementById('input_age')?.value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value || 'male';
    const phone = document.getElementById('input_phone')?.value.trim();
    const emergencyContact = document.getElementById('input_emergencyContact')?.value.trim();

    if (!name || !age || !phone) {
      alert('Please fill in your Name, Age, and Mobile Phone number to proceed.');
      return;
    }

    const aadhaar = document.getElementById('input_aadhaarNumber')?.value.trim();
    const abha = document.getElementById('input_abhaId')?.value.trim();
    const scheme = document.getElementById('input_ayushmanSchemeType')?.value;
    stepPayload.demographics = { fullName: name, age: parseInt(age), gender, phone, emergencyContact, aadhaarNumber: aadhaar, abhaId: abha, ayushmanSchemeType: scheme };
  }

  if (currentStep === 2) {
    stepPayload.chiefComplaint.freeTextDescription = document.getElementById('chiefComplaintFreeText')?.value.trim() || '';
  }

  if (currentStep < totalSteps) {
    renderStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    renderStep(currentStep - 1);
  }
}

function skipStep() {
  if (currentStep < totalSteps) {
    renderStep(currentStep + 1);
  }
}

async function submitIntakeForm() {
  const demographics = stepPayload.demographics;
  const validation = [
    [demographics.fullName, 'Please enter your full name.'],
    [demographics.age, 'Please enter your age.'],
    [demographics.phone, 'Please enter your 10-digit mobile number.']
  ];
  const missing = validation.find(([value]) => !String(value || '').trim());
  if (missing || !/^\d{10}$/.test(String(demographics.phone || '').replace(/\D/g, ''))) {
    alert(missing ? missing[1] : 'Please enter a valid 10-digit mobile number.');
    return;
  }
  const submitBtn = document.getElementById('submitIntakeBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Submitting...';
  }

  const payload = {
    sessionToken: window.kioskSessionToken,
    kioskId: window.kioskId || 'KIOSK-01',
    existingPatientId: window.existingPatientId || undefined,
    language: window.kioskLang || 'en',
    consent: {
      medicalDataSharing: true,
      voiceRecording: window.voiceConsent === true
    },
    stepData: stepPayload
  };

  try {
    if (!navigator.onLine) {
      // Save locally to IndexedDB
      if (window.OfflineSync) {
        await window.OfflineSync.saveIntakeOffline(payload);
        window.location.href = `/kiosk/summary?sessionToken=${window.kioskSessionToken}&lang=${window.kioskLang}&offline=true`;
        return;
      }
    }

    const res = await fetch('/kiosk/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      if (data.redFlagAlert) {
        // Show Emergency Modal
        const modal = document.getElementById('emergencyAlertModal');
        if (modal) {
          document.getElementById('emergencyRuleName').innerText = data.redFlagAlert.ruleName;
          document.getElementById('emergencyAlertText').innerText = data.redFlagAlert.message;
          const bsModal = new bootstrap.Modal(modal);
          bsModal.show();
          return;
        }
      }
      if (data.cardUrl) {
        window.location.href = data.cardUrl;
      } else if (data.patientId) {
        window.location.href = `/kiosk/card/${data.patientId}`;
      } else {
        window.location.href = `/kiosk/summary?sessionToken=${data.sessionToken}&lang=${window.kioskLang}`;
      }
    } else {
      alert('Error: ' + (data.error || 'Failed to submit intake'));
      if (submitBtn) submitBtn.disabled = false;
    }
  } catch (err) {
    console.error('Submission error:', err);
    // Fallback to offline store
    if (window.OfflineSync) {
      await window.OfflineSync.saveIntakeOffline(payload);
      window.location.href = `/kiosk/summary?sessionToken=${window.kioskSessionToken}&lang=${window.kioskLang}&offline=true`;
    } else {
      alert('Submission failed and could not save offline. Please notify hospital staff.');
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}
