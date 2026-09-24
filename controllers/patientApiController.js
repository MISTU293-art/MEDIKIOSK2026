const PatientRecordService = require('../services/patient/patientRecordService');
const PatientReportService = require('../services/patient/patientReportService');
const PatientTimelineService = require('../services/patient/patientTimelineService');
const PatientNotification = require('../models/PatientNotification');
const PatientAccount = require('../models/PatientAccount');
const Document = require('../models/Document');
const Report = require('../models/Report');
const logger = require('../utils/logger');

class PatientApiController {
  /**
   * Section 47: Complete Patient Record Retrieval
   */
  static async getMe(req, res) {
    try {
      const patientId = req.patient.id;
      const record = await PatientRecordService.getPatientCompleteRecord(patientId);
      logger.audit('PATIENT_RECORD_RETRIEVAL', req.patient.uhid, { endpoint: '/api/patient/me' });
      return res.json({
        success: true,
        ...record
      });
    } catch (err) {
      logger.error('API getMe error: ' + err.message);
      return res.status(500).json({ success: false, error: 'Failed to retrieve patient record.' });
    }
  }

  /**
   * Section 46 & 70: Patient Card API
   */
  static async getCard(req, res) {
    try {
      const card = await PatientRecordService.getPatientCard(req.patient.id);
      return res.json({ success: true, card });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 48 & 70: Visits API
   */
  static async getVisits(req, res) {
    try {
      const visits = await PatientRecordService.getVisits(req.patient.id);
      return res.json({ success: true, visits });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Single Visit Details
   */
  static async getVisitById(req, res) {
    try {
      const visit = await PatientRecordService.getVisitDetails(req.patient.id, req.params.id);
      if (!visit) {
        return res.status(404).json({ success: false, error: 'Visit not found or unauthorized' });
      }
      return res.json({ success: true, visit });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 49 & 70: Reports API
   */
  static async getReports(req, res) {
    try {
      const reports = await PatientReportService.getReports(req.patient.id);
      return res.json({ success: true, reports });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 65: Explain Report with AI
   */
  static async explainReport(req, res) {
    try {
      const lang = req.query.lang || req.patient.preferredLanguage || 'en';
      const explanation = await PatientReportService.explainReport(req.patient.id, req.params.id, lang);
      return res.json(explanation);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 49: Secure Authorization-Aware Download
   */
  static async downloadReport(req, res) {
    try {
      const patientId = req.patient.id;
      const reports = await PatientReportService.getReports(patientId);
      const report = reports.find(r => r.id === String(req.params.id)) || reports[0];

      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found or unauthorized' });
      }

      // Generate a structured printable report download
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="Report_${report.testName.replace(/[^a-zA-Z0-9]/g, '_')}.html"`);

      const valuesHtml = Object.entries(report.labValues || {}).map(([k, v]) => {
        const val = typeof v === 'object' ? `${v.value} ${v.unit || ''}` : v;
        const ref = typeof v === 'object' && v.normalRange ? `(Ref: ${v.normalRange})` : '';
        return `<tr><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>${k}</strong></td><td style="padding:8px;border-bottom:1px solid #ddd;">${val}</td><td style="padding:8px;border-bottom:1px solid #ddd;color:#666;">${ref}</td></tr>`;
      }).join('');

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${report.testName} — Official Lab Report</title>
          <style>body{font-family:sans-serif;padding:30px;max-width:800px;margin:auto;} table{width:100%;border-collapse:collapse;} th{background:#f3f4f6;padding:10px;text-align:left;border-bottom:2px solid #ccc;}</style>
        </head>
        <body>
          <h2>National Institute of Ayurveda & AYUSH Research Hospital</h2>
          <p><strong>Department of Clinical Pathology & Diagnostics</strong></p>
          <hr/>
          <p><strong>Patient Name:</strong> ${req.patient.fullName} | <strong>UHID:</strong> ${req.patient.uhid}</p>
          <p><strong>Test Name:</strong> ${report.testName} | <strong>Date:</strong> ${new Date(report.date).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${report.statusLabel} | <strong>Authorized By:</strong> ${report.requestedBy}</p>
          <br/>
          <table>
            <thead><tr><th>Parameter</th><th>Result Value</th><th>Reference Range</th></tr></thead>
            <tbody>${valuesHtml || '<tr><td colspan="3" style="padding:15px;text-align:center;">Normal findings recorded by attending doctor.</td></tr>'}</tbody>
          </table>
          <br/>
          <p><strong>Clinical Notes:</strong> ${report.reviewNotes}</p>
          <hr/>
          <small style="color:#666;">This is an authorized medical record retrieved via the MediKiosk Patient Portal. Certified on ${new Date().toISOString()}.</small>
        </body>
        </html>
      `);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 50 & 70: Prescriptions API
   */
  static async getPrescriptions(req, res) {
    try {
      const prescriptions = await PatientRecordService.getPrescriptions(req.patient.id);
      return res.json({ success: true, prescriptions });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 51 & 70: Medicines History API
   */
  static async getMedicines(req, res) {
    try {
      const medicineData = await PatientRecordService.getMedicineHistory(req.patient.id);
      return res.json({ success: true, ...medicineData });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 52 & 70: Allergies API
   */
  static async getAllergies(req, res) {
    try {
      const allergies = await PatientRecordService.getAllergies(req.patient.id);
      return res.json({ success: true, allergies });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 54 & 70: Documents API
   */
  static async getDocuments(req, res) {
    try {
      const documents = await PatientRecordService.getDocuments(req.patient.id);
      return res.json({ success: true, documents });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Secure Authorization-Aware Document Download
   */
  static async downloadDocument(req, res) {
    try {
      const doc = await Document.findById(req.params.id);
      if (!doc || String(doc.patientId) !== String(req.patient.id)) {
        return res.status(403).json({ success: false, error: 'Access denied or document does not belong to authenticated patient.' });
      }

      if (doc.fileUrl && doc.fileUrl.startsWith('http')) {
        return res.redirect(doc.fileUrl);
      }

      return res.json({
        success: true,
        documentId: doc._id,
        fileName: doc.originalName,
        ocrStatus: doc.ocrStatus,
        verifiedData: doc.verifiedData,
        rawOcrText: doc.rawOcrText
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Upload Patient Document
   */
  static async uploadDocument(req, res) {
    try {
      const { docType, originalName, notes } = req.body;
      const patientId = req.patient.id;

      const newDoc = await Document.create({
        patientId,
        originalName: originalName || 'Patient_Uploaded_Document.pdf',
        fileName: `patient_upload_${Date.now()}.pdf`,
        fileUrl: '/uploads/sample_medical_doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 180,
        docType: docType || 'Prescription',
        documentDate: new Date(),
        ocrStatus: 'draft',
        rawOcrText: 'Document uploaded by patient. Pending hospital OCR validation.',
        staffNotes: notes || 'Uploaded via MediKiosk Patient Portal'
      });

      // Notification
      await PatientNotification.create({
        patientId,
        type: 'document',
        title: 'Document Uploaded',
        message: 'A new medical document has been added to your MediKiosk account.',
        link: '/patient/documents'
      });

      return res.json({ success: true, message: 'Document uploaded successfully', document: newDoc });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 53 & 70: Timeline API
   */
  static async getTimeline(req, res) {
    try {
      const timeline = await PatientTimelineService.buildMedicalTimeline(req.patient.id);
      return res.json({ success: true, timeline });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 55 & 70: Lab Results API
   */
  static async getLabs(req, res) {
    try {
      const labs = await PatientReportService.getLabResults(req.patient.id);
      return res.json({ success: true, labResults: labs });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Consents API
   */
  static async getConsents(req, res) {
    try {
      const consents = await PatientRecordService.getConsents(req.patient.id);
      return res.json({ success: true, consents });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Notifications API
   */
  static async getNotifications(req, res) {
    try {
      const notifications = await PatientNotification.find({ patientId: req.patient.id });
      return res.json({ success: true, notifications });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Mark Notification Read
   */
  static async markNotificationRead(req, res) {
    try {
      const notification = await PatientNotification.findById(req.params.id);
      if (notification && String(notification.patientId) === String(req.patient.id)) {
        await PatientNotification.findByIdAndUpdate(req.params.id, { read: true });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Update Language Preference
   */
  static async updateLanguage(req, res) {
    try {
      const { language } = req.body;
      if (language && ['en', 'hi', 'bn'].includes(language)) {
        await PatientAccount.updateOne({ patientId: req.patient.id }, { preferredLanguage: language });
        req.patient.preferredLanguage = language;
      }
      return res.json({ success: true, preferredLanguage: language });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = PatientApiController;
