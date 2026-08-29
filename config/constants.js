module.exports = {
  ROLES: {
    PATIENT: 'patient',
    STAFF: 'staff',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
    PHARMACIST: 'pharmacist'
  },
  LANGUAGES: {
    EN: 'en',
    HI: 'hi',
    BN: 'bn'
  },
  DEPARTMENTS: [
    'Ayurveda (Kayachikitsa & Panchakarma)',
    'Homoeopathy Medicine',
    'Unani & Tibb System',
    'Siddha Medicine',
    'Yoga & Naturopathy',
    'Integrative Medicine & General OPD',
    'Cardiology & Lifestyle Disorders'
  ],
  AYUSH_SYSTEMS: [
    'Ayurveda',
    'Yoga & Naturopathy',
    'Unani',
    'Siddha',
    'Homoeopathy'
  ],
  PRIORITIES: {
    NORMAL: 'Normal',
    URGENT: 'Urgent',
    RED_FLAG: 'Emergency Red-Flag'
  },
  DOCUMENT_TYPES: {
    PRESCRIPTION: 'Prescription',
    LAB_REPORT: 'Lab Report',
    DISCHARGE_SUMMARY: 'Discharge Summary',
    MEDICAL_CERTIFICATE: 'Medical Certificate',
    OTHER: 'Other'
  },
  OCR_STATUS: {
    PENDING: 'pending',
    DRAFT: 'draft',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  }
};
