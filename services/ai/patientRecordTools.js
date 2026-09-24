const PatientRecordService = require('../patient/patientRecordService');
const PatientReportService = require('../patient/patientReportService');
const PatientTimelineService = require('../patient/patientTimelineService');
const logger = require('../../utils/logger');

class PatientRecordTools {
  constructor(authenticatedPatientId) {
    if (!authenticatedPatientId) {
      throw new Error('PatientRecordTools requires an authenticated patientId. Unauthenticated access blocked.');
    }
    this.patientId = String(authenticatedPatientId);
  }

  async getPatientProfile() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getPatientProfile' });
    return PatientRecordService.getPatientProfile(this.patientId);
  }

  async getPatientCard() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getPatientCard' });
    return PatientRecordService.getPatientCard(this.patientId);
  }

  async getRecentVisits() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getRecentVisits' });
    return PatientRecordService.getVisits(this.patientId);
  }

  async getVisitDetails(visitId) {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getVisitDetails', visitId });
    return PatientRecordService.getVisitDetails(this.patientId, visitId);
  }

  async getLatestReports() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getLatestReports' });
    return PatientReportService.getReports(this.patientId);
  }

  async getReportById(reportId) {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getReportById', reportId });
    const reports = await PatientReportService.getReports(this.patientId);
    return reports.find(r => r.id === String(reportId)) || null;
  }

  async getPrescriptions() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getPrescriptions' });
    return PatientRecordService.getPrescriptions(this.patientId);
  }

  async getMedicineHistory() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getMedicineHistory' });
    return PatientRecordService.getMedicineHistory(this.patientId);
  }

  async getAllergies() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getAllergies' });
    return PatientRecordService.getAllergies(this.patientId);
  }

  async getMedicalTimeline() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getMedicalTimeline' });
    return PatientTimelineService.buildMedicalTimeline(this.patientId);
  }

  async getDocuments() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getDocuments' });
    return PatientRecordService.getDocuments(this.patientId);
  }

  async getLabResults() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getLabResults' });
    return PatientReportService.getLabResults(this.patientId);
  }

  async getConsentStatus() {
    logger.audit('AI_TOOL_ACCESS', this.patientId, { tool: 'getConsentStatus' });
    return PatientRecordService.getConsents(this.patientId);
  }
}

module.exports = PatientRecordTools;
