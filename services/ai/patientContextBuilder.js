const PatientRecordTools = require('./patientRecordTools');

class PatientContextBuilder {
  /**
   * Builds minimal scoped context tailored to the user's inquiry intent
   */
  static async buildScopedContext(patientId, userQuery) {
    const tools = new PatientRecordTools(patientId);
    const query = (userQuery || '').toLowerCase();

    const context = {
      patientSummary: null,
      relevantSection: 'general',
      data: null,
      recordReferences: []
    };

    // Always fetch minimal basic identity
    const profile = await tools.getPatientProfile();
    context.patientSummary = {
      fullName: profile ? profile.fullName : 'Patient',
      uhid: profile ? profile.uhid : '',
      gender: profile ? profile.gender : '',
      age: profile ? profile.age : ''
    };

    // Intent: Reports / Lab Results / Tests / Hemoglobin / Blood
    if (query.match(/(report|test|cbc|blood|hemoglobin|sugar|glucose|creatinine|ecg|lab|scan|x-ray|mri)/i)) {
      context.relevantSection = 'reports';
      const [reports, labs] = await Promise.all([
        tools.getLatestReports(),
        tools.getLabResults()
      ]);
      context.data = { reports: reports.slice(0, 3), labResults: labs.slice(0, 6) };

      if (reports.length > 0) {
        context.recordReferences.push({
          type: 'report',
          id: reports[0].id,
          title: `Report: ${reports[0].testName}`,
          link: '/patient/reports',
          summary: reports[0].reviewNotes || 'Doctor reviewed laboratory report'
        });
      }
      return context;
    }

    // Intent: Medicines / Prescriptions / Drugs / Pills
    if (query.match(/(medicine|medication|pill|tablet|syrup|prescription|dose|dosage|rx|pharmacy)/i)) {
      context.relevantSection = 'medicines';
      const [medicines, prescriptions, allergies] = await Promise.all([
        tools.getMedicineHistory(),
        tools.getPrescriptions(),
        tools.getAllergies()
      ]);
      context.data = {
        currentMedicines: medicines.current,
        recentPrescriptions: prescriptions.slice(0, 4),
        allergies: allergies.drugAllergies
      };

      if (prescriptions.length > 0) {
        context.recordReferences.push({
          type: 'prescription',
          id: prescriptions[0].id,
          title: `Prescription: ${prescriptions[0].medicineName}`,
          link: '/patient/prescriptions',
          summary: `${prescriptions[0].dosage} (${prescriptions[0].frequency}) by ${prescriptions[0].doctor}`
        });
      }
      return context;
    }

    // Intent: Visits / Consultations / Doctor
    if (query.match(/(visit|doctor|consultation|appointment|queue|token|clinic|opd)/i)) {
      context.relevantSection = 'visits';
      const visits = await tools.getRecentVisits();
      context.data = { visits: visits.slice(0, 3) };

      if (visits.length > 0) {
        context.recordReferences.push({
          type: 'visit',
          id: visits[0].id,
          title: `Visit with ${visits[0].doctor}`,
          link: '/patient/visits',
          summary: visits[0].consultationSummary || visits[0].chiefComplaint
        });
      }
      return context;
    }

    // Intent: Timeline / Medical History
    if (query.match(/(timeline|history|past|chronology|events|year)/i)) {
      context.relevantSection = 'timeline';
      const timeline = await tools.getMedicalTimeline();
      context.data = { timelineEvents: timeline.events.slice(0, 6) };

      context.recordReferences.push({
        type: 'timeline',
        id: 'timeline-view',
        title: 'Full Medical Timeline',
        link: '/patient/timeline',
        summary: `Chronological medical timeline across ${timeline.years.length} recorded period(s)`
      });
      return context;
    }

    // Intent: Documents / Files / OCR
    if (query.match(/(document|file|upload|pdf|scan|image|paper)/i)) {
      context.relevantSection = 'documents';
      const docs = await tools.getDocuments();
      context.data = { documents: docs.slice(0, 5) };

      if (docs.length > 0) {
        context.recordReferences.push({
          type: 'document',
          id: docs[0].id,
          title: `Document: ${docs[0].fileName}`,
          link: '/patient/documents',
          summary: docs[0].verificationNote
        });
      }
      return context;
    }

    // Intent: Patient Card / UHID / ID
    if (query.match(/(card|uhid|barcode|qr|abha|membership|id)/i)) {
      context.relevantSection = 'card';
      const card = await tools.getPatientCard();
      context.data = { card };

      context.recordReferences.push({
        type: 'card',
        id: card ? card.uhid : 'card',
        title: 'Digital Patient Card',
        link: '/patient/card',
        summary: `Card No: ${card ? card.patientCardNumber : ''} | UHID: ${card ? card.uhid : ''}`
      });
      return context;
    }

    // Intent: Allergies
    if (query.match(/(allergy|allergic|reaction|anaphylaxis)/i)) {
      context.relevantSection = 'allergies';
      const allergies = await tools.getAllergies();
      context.data = { allergies };

      context.recordReferences.push({
        type: 'allergies',
        id: 'allergies-view',
        title: 'Recorded Allergies',
        link: '/patient/allergies',
        summary: allergies.safetyNotice
      });
      return context;
    }

    // Default: Light overview
    context.relevantSection = 'overview';
    const [card, visits, reports] = await Promise.all([
      tools.getPatientCard(),
      tools.getRecentVisits(),
      tools.getLatestReports()
    ]);
    context.data = {
      cardNumber: card ? card.patientCardNumber : '',
      lastVisit: visits.length > 0 ? visits[0] : null,
      latestReport: reports.length > 0 ? reports[0] : null
    };

    return context;
  }
}

module.exports = PatientContextBuilder;
