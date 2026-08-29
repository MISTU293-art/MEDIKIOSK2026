/**
 * Side-by-Side OCR Document Verification Script
 */
function verifyDocument(docId, action) {
  const form = document.getElementById('ocrVerifyForm');
  const formData = new FormData(form);

  const verifiedData = {
    doctorName: formData.get('doctorName'),
    clinicHospitalName: formData.get('clinicHospitalName'),
    dateOnRecord: formData.get('dateOnRecord'),
    extractedDiagnosis: formData.get('extractedDiagnosis'),
    medicationsList: formData.get('medicationsList').split('\n').filter(Boolean),
    clinicalNotes: formData.get('clinicalNotes'),
    labValues: {
      'BP': formData.get('bpValue') || '',
      'Pulse': formData.get('pulseValue') || '',
      'SPO2': formData.get('spo2Value') || ''
    }
  };

  const staffNotes = formData.get('staffNotes') || '';

  fetch('/api/documents/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId, verifiedData, staffNotes, action })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(action === 'reject' ? 'Document marked as rejected.' : 'Document OCR verified and saved to patient record!');
      window.location.href = '/staff/ocr-verify';
    } else {
      alert('Error: ' + (data.error || 'Verification failed'));
    }
  })
  .catch(err => {
    alert('Failed to submit verification: ' + err.message);
  });
}
