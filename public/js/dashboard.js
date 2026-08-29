/**
 * Staff & Doctor Real-Time Dashboard Manager
 */
function acknowledgeRedFlag(auditId) {
  const action = prompt('Enter immediate action taken (e.g. Fast-tracked to triage, Oxygen administered):', 'Patient immediately attended by triage nurse.');
  if (action === null) return;

  fetch('/staff/acknowledge-red-flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auditId, actionTaken: action })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('Emergency Red-Flag Acknowledged and logged.');
      window.location.reload();
    }
  });
}

function handleDoctorSummaryReview(sessionToken, action) {
  let edits = '';
  let reason = '';

  if (action === 'edit') {
    const currentText = document.getElementById('summaryTextarea').value;
    edits = prompt('Enter your edited summary:', currentText);
    if (edits === null) return;
  } else if (action === 'reject') {
    reason = prompt('Enter reason for rejecting AI draft summary:', 'Inaccurate symptoms or incomplete intake.');
    if (!reason) return;
  }

  fetch('/doctor/review-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken, action, doctorEdits: edits, rejectionReason: reason })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('Summary review status updated to: ' + data.status.toUpperCase());
      window.location.reload();
    }
  });
}
