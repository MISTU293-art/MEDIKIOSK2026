const HELP = {
  register: 'Choose New Patient, select a language, accept consent, and complete the required fields. Staff can assist you at any time.',
  returning: 'Choose Returning Patient and enter your Patient Card Number, UHID, ABHA ID, or registered mobile number. Your old details will be fetched and a new visit token will be created.',
  doctor: 'Doctors can open the queue, review the AI draft, inspect history, request reports, and save the consultation. AI suggestions always require doctor review.',
  privacy: 'Your QR code and barcode contain only your card identifier. Medical details stay in the protected clinical record.',
  emergency: 'If you have severe chest pain, trouble breathing, fainting, stroke-like symptoms, or severe bleeding, alert hospital staff immediately.',
  documents: 'Choose the document type, attach a PDF or image, and submit it for OCR. OCR is only a draft until an authorized staff member verifies it.',
  attendance: 'Open My Attendance, scan or enter your active staff card ID, and submit. The server decides whether the event is clock-in or clock-out.',
  pharmacy: 'Pharmacy staff can retrieve a prescription, review allergy warnings, receive stock deliveries, adjust inventory, and record dispensing.',
  beds: 'Authorized staff can open the Bed Board, allocate an available bed to an active visit, release it to cleaning, and mark it available after turnover.'
};

function answer(message, mode = 'patient') {
  const text = String(message || '').toLowerCase();
  if (/emergency|chest|breath|bleed|faint|stroke/.test(text)) return { message: HELP.emergency, urgent: true };
  if (/document|upload|ocr|scan report|file/.test(text)) return { message: HELP.documents };
  if (/attendance|clock|staff card|id card/.test(text)) return { message: HELP.attendance };
  if (/pharmacy|medicine|stock|inventory|dispens/.test(text)) return { message: HELP.pharmacy };
  if (/bed|ward|admission|allocate/.test(text)) return { message: HELP.beds };
  if (/old|return|card|uhid|abha|token|search/.test(text)) return { message: HELP.returning };
  if (/doctor|report|prescription|clinical/.test(text) || mode === 'doctor') return { message: HELP.doctor };
  if (/private|privacy|qr|barcode|secure/.test(text)) return { message: HELP.privacy };
  return { message: HELP.register };
}

module.exports = { answer };