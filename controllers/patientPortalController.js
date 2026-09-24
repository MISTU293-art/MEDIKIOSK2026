const PatientRecordService = require('../services/patient/patientRecordService');
const PatientReportService = require('../services/patient/patientReportService');
const PatientTimelineService = require('../services/patient/patientTimelineService');
const PatientAssistant = require('../services/ai/patientAssistant');
const PatientNotification = require('../models/PatientNotification');
const PatientAccount = require('../models/PatientAccount');
const logger = require('../utils/logger');

class PatientPortalController {
  /**
   * Section 45: Patient Dashboard
   */
  static async getDashboard(req, res) {
    try {
      const patientId = req.patient.id;
      const [completeRecord, notifications] = await Promise.all([
        PatientRecordService.getPatientCompleteRecord(patientId),
        PatientNotification.find({ patientId }).then(list => list.slice(0, 5))
      ]);

      const suggestedQuestions = PatientAssistant.getSuggestedQuestions(req.patient.preferredLanguage || 'en');

      res.render('patient/dashboard', {
        title: 'Patient Dashboard — MediKiosk Portal',
        patient: completeRecord.patient,
        patientCard: completeRecord.patientCard,
        visits: completeRecord.visits,
        reports: completeRecord.reports,
        documents: completeRecord.documents || [],
        prescriptions: completeRecord.prescriptions,
        medicines: completeRecord.medicines,
        allergies: completeRecord.allergies,
        labResults: completeRecord.labResults,
        timeline: completeRecord.timeline,
        notifications,
        suggestedQuestions,
        currentLanguage: req.patient.preferredLanguage || 'en',
        activeNav: 'dashboard'
      });
    } catch (err) {
      logger.error('Dashboard view error: ' + err.message);
      res.status(500).render('partials/error', {
        title: 'Portal Error',
        message: 'Unable to load patient dashboard. Please try again.',
        user: req.patient
      });
    }
  }

  /**
   * Section 46: Digital Patient Card
   */
  static async getCard(req, res) {
    try {
      const patientId = req.patient.id;
      const card = await PatientRecordService.getPatientCard(patientId);
      res.render('patient/card', {
        title: 'Digital Patient Card — MediKiosk',
        card,
        patient: req.patient,
        activeNav: 'card'
      });
    } catch (err) {
      logger.error('Card view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load patient card.', user: req.patient });
    }
  }

  /**
   * Section 48: Previous Visits
   */
  static async getVisits(req, res) {
    try {
      const patientId = req.patient.id;
      const visits = await PatientRecordService.getVisits(patientId);
      res.render('patient/visits', {
        title: 'My Healthcare Visits — MediKiosk',
        visits,
        patient: req.patient,
        activeNav: 'visits'
      });
    } catch (err) {
      logger.error('Visits view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load visits.', user: req.patient });
    }
  }

  /**
   * Single Visit Details
   */
  static async getVisitDetail(req, res) {
    try {
      const patientId = req.patient.id;
      const visit = await PatientRecordService.getVisitDetails(patientId, req.params.id);
      if (!visit) {
        return res.status(404).render('partials/error', { title: 'Not Found', message: 'Visit record not found.', user: req.patient });
      }
      res.render('patient/visitDetail', {
        title: `Visit ${visit.visitNumber} — MediKiosk`,
        visit,
        patient: req.patient,
        activeNav: 'visits'
      });
    } catch (err) {
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Error retrieving visit details.', user: req.patient });
    }
  }

  /**
   * Section 49: Reports
   */
  static async getReports(req, res) {
    try {
      const patientId = req.patient.id;
      const reports = await PatientReportService.getReports(patientId);
      res.render('patient/reports', {
        title: 'Diagnostic Reports — MediKiosk',
        reports,
        patient: req.patient,
        activeNav: 'reports'
      });
    } catch (err) {
      logger.error('Reports view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load reports.', user: req.patient });
    }
  }

  /**
   * Section 50: Prescriptions
   */
  static async getPrescriptions(req, res) {
    try {
      const patientId = req.patient.id;
      const prescriptions = await PatientRecordService.getPrescriptions(patientId);
      res.render('patient/prescriptions', {
        title: 'Prescriptions — MediKiosk',
        prescriptions,
        patient: req.patient,
        activeNav: 'prescriptions'
      });
    } catch (err) {
      logger.error('Prescriptions view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load prescriptions.', user: req.patient });
    }
  }

  /**
   * Section 51: Medicine History
   */
  static async getMedicines(req, res) {
    try {
      const patientId = req.patient.id;
      const medicineData = await PatientRecordService.getMedicineHistory(patientId);
      res.render('patient/medicines', {
        title: 'Medicine History & Timeline — MediKiosk',
        current: medicineData.current,
        previous: medicineData.previous,
        completed: medicineData.completed,
        discontinued: medicineData.discontinued,
        timeline: medicineData.timeline,
        patient: req.patient,
        activeNav: 'medicines'
      });
    } catch (err) {
      logger.error('Medicines view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load medicine history.', user: req.patient });
    }
  }

  /**
   * Section 52: Allergies
   */
  static async getAllergies(req, res) {
    try {
      const patientId = req.patient.id;
      const allergyInfo = await PatientRecordService.getAllergies(patientId);
      res.render('patient/allergies', {
        title: 'Recorded Allergies — MediKiosk',
        allergies: allergyInfo,
        patient: req.patient,
        activeNav: 'allergies'
      });
    } catch (err) {
      logger.error('Allergies view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load allergies.', user: req.patient });
    }
  }

  /**
   * Section 53: Medical Timeline
   */
  static async getTimeline(req, res) {
    try {
      const patientId = req.patient.id;
      const timeline = await PatientTimelineService.buildMedicalTimeline(patientId);
      res.render('patient/timeline', {
        title: 'Medical Timeline — MediKiosk',
        timeline,
        patient: req.patient,
        activeNav: 'timeline'
      });
    } catch (err) {
      logger.error('Timeline view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load timeline.', user: req.patient });
    }
  }

  /**
   * Section 54: Patient Documents
   */
  static async getDocuments(req, res) {
    try {
      const patientId = req.patient.id;
      const documents = await PatientRecordService.getDocuments(patientId);
      res.render('patient/documents', {
        title: 'My Medical Documents — MediKiosk',
        documents,
        patient: req.patient,
        activeNav: 'documents'
      });
    } catch (err) {
      logger.error('Documents view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load documents.', user: req.patient });
    }
  }

  /**
   * Section 55: Lab Results
   */
  static async getLabs(req, res) {
    try {
      const patientId = req.patient.id;
      const labResults = await PatientReportService.getLabResults(patientId);
      res.render('patient/labs', {
        title: 'Laboratory Results — MediKiosk',
        labResults,
        patient: req.patient,
        activeNav: 'labs'
      });
    } catch (err) {
      logger.error('Labs view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load lab results.', user: req.patient });
    }
  }

  /**
   * Section 58 & 64: AI Health Assistant Chat Interface
   */
  static async getChat(req, res) {
    try {
      const patientId = req.patient.id;
      const lang = req.query.lang || req.patient.preferredLanguage || 'en';
      const suggestedQuestions = PatientAssistant.getSuggestedQuestions(lang);

      res.render('patient/chat', {
        title: 'AI Health Assistant — MediKiosk',
        patient: req.patient,
        suggestedQuestions,
        currentLanguage: lang,
        activeNav: 'chat'
      });
    } catch (err) {
      logger.error('Chat view error: ' + err.message);
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load AI Health Assistant.', user: req.patient });
    }
  }

  /**
   * Patient Profile & Settings
   */
  static async getProfile(req, res) {
    try {
      const patientId = req.patient.id;
      const profile = await PatientRecordService.getPatientProfile(patientId);
      res.render('patient/profile', {
        title: 'Patient Profile — MediKiosk',
        profile,
        patient: req.patient,
        activeNav: 'profile'
      });
    } catch (err) {
      res.status(500).render('partials/error', { title: 'Portal Error', message: 'Unable to load profile.', user: req.patient });
    }
  }
}

module.exports = PatientPortalController;
