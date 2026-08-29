/**
 * Pan-India AYUSH Doctor Roster & Smart Department Matcher (SIH Prototype)
 * Dynamically assigns appropriate specialists and consulting rooms across Indian states.
 */

const DEPARTMENT_DOCTOR_ROSTER = {
  'Ayurveda (Kayachikitsa & Panchakarma)': {
    doctorName: 'Dr. Rajesh Kumar Sharma, BAMS, MD (Ayurveda)',
    qualification: 'Senior Kayachikitsa Specialist & Panchakarma Acharya',
    doctorId: 'DOC-AYU-01',
    roomNumber: 'Room 104, AYUSH Wing A',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'Morning OPD (09:00 - 14:00)'
  },
  'Homoeopathy Medicine': {
    doctorName: 'Dr. Ananya Mukherjee, BHMS, MD (Homoeopathy)',
    qualification: 'Consultant Homoeopath & Chronic Care Physician',
    doctorId: 'DOC-HOM-02',
    roomNumber: 'Room 202, Homoeopathy Wing B',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'Full Day OPD (10:00 - 16:00)'
  },
  'Unani & Tibb System': {
    doctorName: 'Dr. Tariq Ahmad Khan, BUMS, MD (Unani Ilaj-bit-Tadbeer)',
    qualification: 'Senior Hakim & Regimenal Therapy Specialist',
    doctorId: 'DOC-UNA-03',
    roomNumber: 'Room 301, Unani Wing C',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'Morning OPD (09:30 - 13:30)'
  },
  'Siddha Medicine': {
    doctorName: 'Dr. K. Murugan, BSMS, MD (Siddha Maruthuvam)',
    qualification: 'Chief Siddha Physician & Varma Expert',
    doctorId: 'DOC-SID-04',
    roomNumber: 'Room 305, Siddha Block',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'Specialty OPD (10:00 - 15:00)'
  },
  'Yoga & Naturopathy': {
    doctorName: 'Dr. Priya Nair, BNYS, PGDY (Naturopathy & Yoga)',
    qualification: 'Clinical Naturopath & Lifestyle Medicine Specialist',
    doctorId: 'DOC-NAT-05',
    roomNumber: 'Room 108, Yoga & Wellness Wing',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'Wellness OPD (08:00 - 14:00)'
  },
  'Integrative Medicine & General OPD': {
    doctorName: 'Dr. Arindam Banerjee, MBBS, MD (Internal Medicine)',
    qualification: 'Integrative Clinical Lead & Senior Physician',
    doctorId: 'DOC-INT-06',
    roomNumber: 'Room 101, Central General OPD',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'OPD (09:00 - 17:00)'
  },
  'Cardiology & Lifestyle Disorders': {
    doctorName: 'Dr. Vikram Singhania, MBBS, MD, DM (Cardiology)',
    qualification: 'Consultant Preventive & Integrative Cardiologist',
    doctorId: 'DOC-CAR-07',
    roomNumber: 'Room 112, Cardiac & Metabolic Care',
    state: 'Pan-India AYUSH Network',
    consultationSlot: 'Specialist Clinic (11:00 - 16:00)'
  }
};

function getDoctorForDepartment(department) {
  if (department && DEPARTMENT_DOCTOR_ROSTER[department]) {
    return DEPARTMENT_DOCTOR_ROSTER[department];
  }
  // Default to Ayurveda / General
  return DEPARTMENT_DOCTOR_ROSTER['Ayurveda (Kayachikitsa & Panchakarma)'];
}

module.exports = {
  DEPARTMENT_DOCTOR_ROSTER,
  getDoctorForDepartment
};
