const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const RedFlagAudit = require('../models/RedFlagAudit');
const Patient = require('../models/Patient');

const rulesPath = path.join(__dirname, '../utils/redFlagRules.json');
let cachedRules = null;

const getRules = () => {
  if (!cachedRules) {
    const raw = fs.readFileSync(rulesPath, 'utf8');
    cachedRules = JSON.parse(raw);
  }
  return cachedRules;
};

class RedFlagService {
  /**
   * Evaluates patient intake responses in real-time against auditable clinician-signed rules.
   */
  static async evaluateIntake(stepData, patientInfo = {}, sessionToken = '', kioskId = 'KIOSK-01') {
    const rulesConfig = getRules();
    const rules = rulesConfig.rules || [];
    
    // Aggregate all text and selected symptom strings
    const searchCorpus = [];
    
    if (stepData.chiefComplaint) {
      if (stepData.chiefComplaint.selectedOptions) {
        searchCorpus.push(...stepData.chiefComplaint.selectedOptions);
      }
      if (stepData.chiefComplaint.freeTextDescription) {
        searchCorpus.push(stepData.chiefComplaint.freeTextDescription);
      }
    }
    if (stepData.hpi) {
      if (stepData.hpi.onset) searchCorpus.push(stepData.hpi.onset);
      if (stepData.hpi.progression) searchCorpus.push(stepData.hpi.progression);
    }
    if (stepData.voiceMetadata && Array.isArray(stepData.voiceMetadata)) {
      stepData.voiceMetadata.forEach(v => {
        if (v.transcribedText) searchCorpus.push(v.transcribedText);
      });
    }

    const fullCorpusText = searchCorpus.join(' ').toLowerCase();

    for (const rule of rules) {
      const primaryMatch = rule.keywords.some(kw => fullCorpusText.includes(kw.toLowerCase()));
      
      let secondaryMatch = true;
      if (rule.secondaryRequiredKeywords && rule.secondaryRequiredKeywords.length > 0) {
        secondaryMatch = rule.secondaryRequiredKeywords.some(skw => fullCorpusText.includes(skw.toLowerCase()));
      }

      if (primaryMatch && secondaryMatch) {
        logger.redFlag(rule.id, patientInfo._id || patientInfo.uhid, {
          ruleName: rule.name,
          severity: rule.severity,
          kioskId
        });

        // Create audit record
        const auditRecord = await RedFlagAudit.create({
          patientId: String(patientInfo._id || patientInfo.uhid || 'PENDING'),
          patientName: patientInfo.fullName || stepData.demographics?.fullName || 'Anonymous Patient',
          uhid: patientInfo.uhid || 'TEMP-UHID',
          sessionToken,
          kioskId,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          triggeredKeywords: rule.keywords.filter(kw => fullCorpusText.includes(kw.toLowerCase())),
          triggeredAt: new Date(),
          escalationSlaMet: true
        });

        // Escalate patient priority if patient exists
        if (patientInfo._id) {
          await Patient.findByIdAndUpdate(patientInfo._id, {
            priority: 'Emergency Red-Flag',
            prioritySource: 'red_flag_system'
          });
        }

        return {
          hasRedFlag: true,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          patientAlertMessage: rule.patientAlertMessage,
          escalationLevel: rule.escalationLevel,
          auditId: auditRecord._id
        };
      }
    }

    return {
      hasRedFlag: false,
      disclaimer: rulesConfig.disclaimer
    };
  }

  static getRulesMetadata() {
    return getRules();
  }
}

module.exports = RedFlagService;
