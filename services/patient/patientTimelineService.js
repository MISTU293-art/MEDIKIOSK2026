const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
const ConsultationNote = require('../../models/ConsultationNote');
const Report = require('../../models/Report');
const Document = require('../../models/Document');
const DispensationRecord = require('../../models/DispensationRecord');
const logger = require('../../utils/logger');

class PatientTimelineService {
  /**
   * Section 53: Expose the medical timeline created by the MediKiosk medical-document intelligence system
   */
  static async buildMedicalTimeline(patientId) {
    const patient = await Patient.findById(patientId);
    const visits = await Visit.find({ patientId });
    const notes = await ConsultationNote.find({ patientId });
    const reports = await Report.find({ patientId });
    const docs = await Document.find({ patientId });
    const dispensations = await DispensationRecord.find({ patientId });

    const rawEvents = [];

    // 1. Visits
    visits.forEach(v => {
      rawEvents.push({
        id: `EV-VISIT-${v._id}`,
        type: 'Hospital Visit',
        category: 'visit',
        icon: 'bi-hospital',
        badgeColor: 'primary',
        title: `Outpatient Visit — ${v.department || 'General Medicine'}`,
        description: `Consultation with ${v.assignedDoctorName || 'Hospital Specialist'}. Chief complaint: ${v.chiefComplaint || v.symptoms || 'General Evaluation'}.`,
        date: v.createdAt,
        recordLink: `/patient/visits`,
        recordId: String(v._id),
        meta: { department: v.department, doctor: v.assignedDoctorName }
      });
    });

    // 2. Doctor Consultations
    notes.forEach(n => {
      rawEvents.push({
        id: `EV-NOTE-${n._id}`,
        type: 'Doctor Consultation',
        category: 'consultation',
        icon: 'bi-person-badge',
        badgeColor: 'success',
        title: `Clinical Consultation Summary`,
        description: `Impression: ${n.clinicalImpression || 'Clinical evaluation recorded'}. ${n.prescribedMedications ? `${n.prescribedMedications.length} medicines prescribed.` : ''}`,
        date: n.createdAt,
        recordLink: `/patient/visits`,
        recordId: String(n._id),
        meta: { doctor: n.doctorName || n.attendingDoctor, followUp: n.followUpDate }
      });
    });

    // 3. Reports & Tests
    reports.forEach(r => {
      rawEvents.push({
        id: `EV-RPT-${r._id}`,
        type: 'Laboratory & Diagnostic Test',
        category: 'report',
        icon: 'bi-file-earmark-medical',
        badgeColor: 'info',
        title: `${r.testName || r.reportType || 'Diagnostic Test'}`,
        description: `Status: ${r.status === 'reviewed' ? 'Doctor Reviewed' : 'Pending'}. Priority: ${(r.priority || 'routine').toUpperCase()}.`,
        date: r.createdAt,
        recordLink: `/patient/reports`,
        recordId: String(r._id),
        meta: { status: r.status, requestedBy: r.requestedBy }
      });
    });

    // 4. Documents & OCR
    docs.forEach(d => {
      rawEvents.push({
        id: `EV-DOC-${d._id}`,
        type: 'Medical Document Uploaded',
        category: 'document',
        icon: 'bi-file-earmark-text',
        badgeColor: 'secondary',
        title: `${d.docType || 'Medical Document'} (${d.originalName || d.fileName})`,
        description: `Processed by MediKiosk Document Intelligence. OCR Status: ${d.ocrStatus}.`,
        date: d.documentDate || d.createdAt,
        recordLink: `/patient/documents`,
        recordId: String(d._id),
        meta: { ocrStatus: d.ocrStatus, mimeType: d.mimeType }
      });
    });

    // 5. Pharmacy Dispensations
    dispensations.forEach(disp => {
      rawEvents.push({
        id: `EV-DISP-${disp._id}`,
        type: 'Pharmacy Dispensation',
        category: 'pharmacy',
        icon: 'bi-capsule',
        badgeColor: 'warning',
        title: 'Hospital Pharmacy Dispensation',
        description: `Dispensed by ${disp.pharmacistName || 'Registered Pharmacist'}. Total: ₹${disp.totalBillAmount || 0}.`,
        date: disp.dispensedAt || disp.createdAt,
        recordLink: `/patient/medicines`,
        recordId: String(disp._id),
        meta: { pharmacist: disp.pharmacistName }
      });
    });

    // 6. Patient Registration Event
    if (patient) {
      rawEvents.push({
        id: `EV-REG-${patient._id}`,
        type: 'Patient Registration',
        category: 'registration',
        icon: 'bi-card-heading',
        badgeColor: 'dark',
        title: 'MediKiosk Patient Onboarding',
        description: `Registered with UHID ${patient.uhid}. Digital Patient Card issued.`,
        date: patient.createdAt,
        recordLink: `/patient/card`,
        recordId: String(patient._id),
        meta: { uhid: patient.uhid, cardNumber: patient.cardNumber }
      });
    }

    // Sort all events in reverse chronological order (newest first)
    rawEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Group events by Year (2026, 2025, 2024, etc.)
    const groupedByYear = {};
    rawEvents.forEach(evt => {
      const year = new Date(evt.date).getFullYear() || 2026;
      if (!groupedByYear[year]) {
        groupedByYear[year] = [];
      }
      groupedByYear[year].push(evt);
    });

    // Format array of years for structured rendering
    const timelineByYears = Object.keys(groupedByYear)
      .sort((a, b) => Number(b) - Number(a))
      .map(year => ({
        year: Number(year),
        events: groupedByYear[year]
      }));

    return {
      totalEvents: rawEvents.length,
      events: rawEvents,
      years: timelineByYears
    };
  }
}

module.exports = PatientTimelineService;
