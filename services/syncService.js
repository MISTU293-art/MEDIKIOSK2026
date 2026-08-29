const logger = require('../utils/logger');
const Kiosk = require('../models/Kiosk');
const IntakeSession = require('../models/IntakeSession');
const Patient = require('../models/Patient');
const RedFlagService = require('./redFlagService');
const AiSummaryService = require('./aiSummaryService');

class SyncService {
  /**
   * Reconciles offline queued intake sessions when kiosk reconnects.
   * Performs idempotency checks to prevent duplicate token creation.
   */
  static async processSyncBatch(kioskId, queuedSubmissions = []) {
    const results = {
      kioskId,
      totalReceived: queuedSubmissions.length,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    };

    logger.info(`Starting offline sync reconciliation for Kiosk ${kioskId}. Total items: ${queuedSubmissions.length}`);

    for (const item of queuedSubmissions) {
      try {
        const { sessionToken, stepData, language, consent, offlineTimestamp } = item;

        // Idempotency check: verify if sessionToken already exists
        const existingSession = await IntakeSession.findOne({ sessionToken });
        if (existingSession) {
          logger.info(`Session ${sessionToken} already reconciled. Skipping duplicate.`);
          results.syncedCount++;
          continue;
        }

        // 1. Create or link patient
        const uhid = 'UHID-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 90 + 10);
        const tokenNumber = 'T-' + Math.floor(Math.random() * 900 + 100);

        const patient = await Patient.create({
          uhid,
          tokenNumber,
          fullName: stepData.demographics?.fullName || 'Patient ' + tokenNumber,
          age: parseInt(stepData.demographics?.age) || 30,
          gender: stepData.demographics?.gender || 'male',
          phone: stepData.demographics?.phone || '0000000000',
          emergencyContact: stepData.demographics?.emergencyContact || '',
          preferredLanguage: language || 'en',
          status: 'queued',
          priority: 'Normal',
          prioritySource: 'staff_assigned'
        });

        // 2. Evaluate Red-Flag Safety Net
        const redFlagResult = await RedFlagService.evaluateIntake(stepData, patient, sessionToken, kioskId);

        // 3. Draft AI Summary
        const aiSummary = AiSummaryService.generateDraftSummary(stepData, patient, language);

        // 4. Save Intake Session
        await IntakeSession.create({
          sessionToken,
          kioskId,
          patientId: String(patient._id),
          language: language || 'en',
          consent: {
            medicalDataSharing: consent?.medicalDataSharing ?? true,
            voiceRecording: consent?.voiceRecording ?? false,
            consentTimestamp: new Date(offlineTimestamp || Date.now())
          },
          stepData,
          redFlagCheck: {
            hasRedFlag: redFlagResult.hasRedFlag,
            ruleId: redFlagResult.ruleId,
            ruleName: redFlagResult.ruleName,
            patientAlertShown: redFlagResult.hasRedFlag
          },
          aiSummary: {
            status: 'pending',
            isAiDrafted: true,
            draftText: aiSummary.draftText,
            soapStructure: aiSummary.formattedSoap
          },
          isOfflineSubmission: true,
          syncedAt: new Date(),
          status: 'submitted'
        });

        results.syncedCount++;
      } catch (err) {
        logger.error(`Failed to sync item from kiosk ${kioskId}: ${err.message}`);
        results.failedCount++;
        results.errors.push({ sessionToken: item.sessionToken, error: err.message });
      }
    }

    // Update Kiosk health record
    await Kiosk.updateOne(
      { kioskId },
      {
        status: 'online',
        lastPingAt: new Date(),
        lastSyncAt: new Date(),
        pendingOfflineSubmissions: results.failedCount
      }
    );

    logger.info(`Sync reconciliation complete for Kiosk ${kioskId}. Synced: ${results.syncedCount}, Failed: ${results.failedCount}`);
    return results;
  }

  static async recordHeartbeat(kioskId, ipAddress = '', pendingCount = 0) {
    return Kiosk.updateOne(
      { kioskId },
      {
        status: 'online',
        lastPingAt: new Date(),
        ipAddress,
        pendingOfflineSubmissions: pendingCount
      }
    );
  }
}

module.exports = SyncService;
