const logger = require('../../utils/logger');
const SafetyGuard = require('./safetyGuard');

class ResponseGenerator {
  /**
   * Generates patient response based on user query, scoped patient context, and language
   */
  static async generateAnswer(query, scopedContext, language = 'en') {
    const q = (query || '').toLowerCase().trim();
    const { patientSummary, relevantSection, data, recordReferences } = scopedContext;
    const name = (patientSummary && patientSummary.fullName) || 'Patient';

    let answer = '';

    // ================= 1. REPORTS & LAB VALUES =================
    if (relevantSection === 'reports') {
      const reports = (data && data.reports) || [];
      const labs = (data && data.labResults) || [];

      if (q.includes('hemoglobin') || q.includes('hb')) {
        const hb = labs.find(l => l.parameter.toLowerCase().includes('hemoglobin'));
        if (hb) {
          if (language === 'hi') {
            answer = `आपके नवीनतम रक्त परीक्षण के अनुसार, आपका हीमोग्लोबिन स्तर **${hb.value} ${hb.unit}** है। (सामान्य सीमा: ${hb.referenceRange})। स्थिति: ${hb.status}।`;
          } else if (language === 'bn') {
            answer = `আপনার সাম্প্রতিক রক্ত ​​পরীক্ষা অনুসারে, আপনার হিমোগ্লোবিনের মাত্রা **${hb.value} ${hb.unit}**। (স্বাভাবিক পরিসর: ${hb.referenceRange})। স্থিতি: ${hb.status}।`;
          } else {
            answer = `According to your latest blood records, your Hemoglobin value is **${hb.value} ${hb.unit}** (Normal reference range: ${hb.referenceRange}). Current status: ${hb.status}.`;
          }
        } else {
          answer = language === 'hi'
            ? 'आपके हालिया रिकॉर्ड में विशिष्ट हीमोग्लोबिन मान नहीं मिला।'
            : language === 'bn'
            ? 'আপনার সাম্প্রতিক রেকর্ডে নির্দিষ্ট হিমোগ্লোবিন মান পাওয়া যায়নি।'
            : 'No specific Hemoglobin value was found in your recent lab records.';
        }
      } else if (q.includes('blood test') || q.includes('latest report') || q.includes('blood sugar') || q.includes('cbc')) {
        if (reports.length > 0) {
          const r = reports[0];
          const dateStr = new Date(r.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'en-US');
          if (language === 'hi') {
            answer = `आपका नवीनतम रिपोर्ट **${r.testName}** है, जो दिनांक **${dateStr}** का है। स्थिति: **${r.statusLabel}**। समीक्षा: ${r.reviewNotes}।`;
          } else if (language === 'bn') {
            answer = `আপনার সর্বশেষ আপলোড করা রিপোর্ট হলো **${r.testName}**, তারিখ **${dateStr}**। স্থিতি: **${r.statusLabel}**।`;
          } else {
            answer = `Your latest uploaded report is **${r.testName}** dated **${dateStr}**. Status: **${r.statusLabel}**. Review summary: ${r.reviewNotes}. Would you like to view the full report?`;
          }
        } else {
          answer = language === 'hi'
            ? 'वर्तमान में आपकी प्रोफ़ाइल में कोई रिपोर्ट दर्ज नहीं है।'
            : language === 'bn'
            ? 'বর্তমানে আপনার প্রোফাইলে কোনো রিপোর্ট রেকর্ড করা নেই।'
            : 'No uploaded medical reports are currently found in your records.';
        }
      } else {
        // General reports breakdown
        if (reports.length > 0) {
          const r = reports[0];
          answer = language === 'hi'
            ? `आपके पास **${reports.length}** हालिया परीक्षण रिपोर्ट उपलब्ध हैं। नवीनतम परीक्षण: **${r.testName}** (${new Date(r.date).toLocaleDateString()})।`
            : language === 'bn'
            ? `আপনার প্রোফাইলে **${reports.length}** টি সাম্প্রতিক রিপোর্ট রয়েছে। সর্বশেষ: **${r.testName}** (${new Date(r.date).toLocaleDateString()})।`
            : `You have **${reports.length}** recent diagnostic test report(s) on file. Latest: **${r.testName}** (${new Date(r.date).toLocaleDateString()}). You can view the complete values or request an explanation.`;
        } else {
          answer = 'You do not have any pending diagnostic reports recorded.';
        }
      }
    }

    // ================= 2. MEDICINES & PRESCRIPTIONS =================
    else if (relevantSection === 'medicines') {
      const current = (data && data.currentMedicines) || [];
      const rx = (data && data.recentPrescriptions) || [];

      if (current.length > 0 || rx.length > 0) {
        const medNames = (current.length > 0 ? current : rx).map(m => m.medicineName).slice(0, 4).join(', ');
        if (language === 'hi') {
          answer = `आपके रिकॉर्ड में दर्ज वर्तमान दवाएं हैं: **${medNames}**। कृपया डॉक्टर के निर्देशानुसार समय पर दवाएं लें। क्या आप किसी दवा की खुराक देखना चाहते हैं?`;
        } else if (language === 'bn') {
          answer = `আপনার রেকর্ডে উল্লেখিত বর্তমান ওষুধগুলি হলো: **${medNames}**। চিকিৎসকের পরামর্শ অনুযায়ী সময়মতো ওষুধ গ্রহণ করুন।`;
        } else {
          answer = `Currently recorded medications in your profile include: **${medNames}**.\n\nPrescribed details: ${rx.length > 0 ? `${rx[0].medicineName} - ${rx[0].dosage} (${rx[0].frequency}) by ${rx[0].doctor}.` : 'Review the Prescriptions tab for complete schedules.'}`;
        }
      } else {
        answer = language === 'hi'
          ? 'वर्तमान में आपके रिकॉर्ड में कोई सक्रिय दवा दर्ज नहीं है।'
          : language === 'bn'
          ? 'বর্তমানে আপনার রেকর্ডে কোনো ওষুধ তালিকাভুক্ত নেই।'
          : 'No active medications or prescriptions are currently recorded for your profile.';
      }
    }

    // ================= 3. VISITS & DOCTOR CONSULTATION =================
    else if (relevantSection === 'visits') {
      const visits = (data && data.visits) || [];
      if (visits.length > 0) {
        const v = visits[0];
        const dateStr = new Date(v.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'en-US');
        if (language === 'hi') {
          answer = `आपकी पिछली यात्रा दिनांक **${dateStr}** को **${v.department}** विभाग में **${v.doctor}** के साथ थी। परामर्श सारांश: "${v.consultationSummary}"।`;
        } else if (language === 'bn') {
          answer = `আপনার শেষ পরিদর্শন হয়েছিল **${dateStr}** তারিখে **${v.department}** বিভাগে **${v.doctor}** এর সাথে। সারাংশ: "${v.consultationSummary}"।`;
        } else {
          answer = `Your previous healthcare visit was on **${dateStr}** with **${v.doctor}** (${v.department}). Chief complaint: "${v.chiefComplaint}". Summary: ${v.consultationSummary}.`;
        }
      } else {
        answer = language === 'hi'
          ? 'आपके पिछले डॉक्टर परामर्श का कोई रिकॉर्ड नहीं मिला।'
          : language === 'bn'
          ? 'আপনার অতীতের কোনো ডাক্তারের পরামর্শের রেকর্ড পাওয়া যায়নি।'
          : 'No previous outpatient consultations were found in your record history.';
      }
    }

    // ================= 4. MEDICAL TIMELINE =================
    else if (relevantSection === 'timeline') {
      const events = (data && data.timelineEvents) || [];
      if (events.length > 0) {
        const summaryList = events.slice(0, 3).map(e => `• ${new Date(e.date).getFullYear()}: ${e.title} (${e.type})`).join('\n');
        if (language === 'hi') {
          answer = `यहाँ आपके मेडिकल टाइमलाइन का सारांश है:\n\n${summaryList}\n\nआप टाइमलाइन टैब में पूरा इतिहास देख सकते हैं।`;
        } else if (language === 'bn') {
          answer = `এখানে আপনার মেডিকেল টাইমলাইনের সংক্ষিপ্ত বিবরণ:\n\n${summaryList}\n\nসম্পূর্ণ ইতিহাস দেখতে টাইমলাইন ট্যাবে যান।`;
        } else {
          answer = `Here is a summary from your MediKiosk Medical Timeline:\n\n${summaryList}\n\nEvery event is securely synchronized with your clinical consultations and lab tests.`;
        }
      } else {
        answer = 'Your medical timeline has just started with your recent registration.';
      }
    }

    // ================= 5. PATIENT CARD =================
    else if (relevantSection === 'card') {
      const card = (data && data.card) || {};
      if (language === 'hi') {
        answer = `आपका मेडीकियोस्क डिजिटल पेशेंट कार्ड:\n• नाम: **${card.patientName}**\n• कार्ड संख्या: **${card.patientCardNumber}**\n• यूएचआईडी (UHID): **${card.uhid}**\n• पंजीकृत मोबाइल: **${card.maskedPhone}**\n\nकार्ड देखने या डाउनलोड करने के लिए नीचे दिए गए बटन का उपयोग करें।`;
      } else if (language === 'bn') {
        answer = `আপনার মেডিকিয়স্ক ডিজিটাল পেশেন্ট কার্ড:\n• নাম: **${card.patientName}**\n• কার্ড নম্বর: **${card.patientCardNumber}**\n• UHID: **${card.uhid}**\n• মোবাইল: **${card.maskedPhone}**`;
      } else {
        answer = `Here is your MediKiosk Digital Patient Card information:\n• Name: **${card.patientName}**\n• Card Number: **${card.patientCardNumber}**\n• UHID: **${card.uhid}**\n• Masked Mobile: **${card.maskedPhone}**\n• Hospital: ${card.hospitalName}\n\nYour digital card features a secure, privacy-compliant QR code and barcode.`;
      }
    }

    // ================= 6. ALLERGIES =================
    else if (relevantSection === 'allergies') {
      const allergies = (data && data.allergies) || {};
      const drugs = allergies.drugAllergies || [];
      const foods = allergies.foodAllergies || [];

      if (drugs.length > 0 || foods.length > 0) {
        answer = language === 'hi'
          ? `आपके रिकॉर्ड में दर्ज एलर्जी:\n• दवाइयां: ${drugs.join(', ') || 'कोई नहीं'}\n• खाद्य पदार्थ: ${foods.join(', ') || 'कोई नहीं'}\n\n${allergies.safetyNotice}`
          : language === 'bn'
          ? `আপনার রেকর্ডে থাকা অ্যালার্জি:\n• ওষুধ: ${drugs.join(', ') || 'নেই'}\n• খাদ্য: ${foods.join(', ') || 'নেই'}\n\n${allergies.safetyNotice}`
          : `Recorded allergies for your profile:\n• Drug Allergies: ${drugs.join(', ') || 'None recorded'}\n• Food Allergies: ${foods.join(', ') || 'None recorded'}\n\n${allergies.safetyNotice}`;
      } else {
        answer = 'No drug or food allergies are currently recorded for your profile. If you have any allergies, please notify the doctor or nurse during your consultation.';
      }
    }

    // ================= 7. DOCUMENTS =================
    else if (relevantSection === 'documents') {
      const docs = (data && data.documents) || [];
      if (docs.length > 0) {
        const docList = docs.map(d => `• ${d.fileName} (${d.docType})`).join('\n');
        answer = `You have **${docs.length}** medical document(s) uploaded to your portal:\n\n${docList}\n\nAll documents are securely stored and viewable anytime.`;
      } else {
        answer = 'You have not uploaded any medical documents yet. You can upload previous prescriptions, lab reports, or discharge summaries anytime using the Documents tab.';
      }
    }

    // ================= 8. GENERAL GREETING / HOSPITAL FAQ =================
    else {
      if (q.includes('hello') || q.includes('hi') || q.includes('namaste')) {
        if (language === 'hi') {
          answer = `नमस्ते **${name}**! मैं आपका मेडीकियोस्क एआई स्वास्थ्य सहायक हूँ। मैं आपकी मेडिकल रिपोर्ट्स, दवाइयों, डॉक्टर विजिट्स और कार्ड से जुड़े सवालों में आपकी मदद कर सकता हूँ। आज मैं आपकी क्या सहायता कर सकता हूँ?`;
        } else if (language === 'bn') {
          answer = `নমস্কার **${name}**! আমি আপনার মেডিকিয়স্ক এআই স্বাস্থ্য সহকারী। আপনার প্রেসক্রিপশন, রিপোর্ট বা আগের ডাক্তার দেখানোর বিবরণ জানতে আমাকে যেকোনো প্রশ্ন করতে পারেন।`;
        } else {
          answer = `Hello **${name}**! Welcome to your MediKiosk AI Health Assistant. I am here to help you understand your medical reports, medication schedules, previous doctor consultations, and navigate hospital care. How can I help you today?`;
        }
      } else if (q.includes('prepare') || q.includes('visit') || q.includes('appointment')) {
        answer = `To prepare for your hospital visit:\n1. Bring your digital MediKiosk Patient Card (or UHID: ${patientSummary.uhid || 'recorded'}).\n2. Have your current medications or prescription bottles ready.\n3. Note any new or changing symptoms you wish to discuss with the doctor.\n4. Arrive 15 minutes before your estimated queue time.`;
      } else {
        answer = `I am your MediKiosk AI Health Assistant. I can assist you with:\n• Explaining your latest laboratory reports (CBC, blood sugar, etc.)\n• Checking your prescribed medicines and dosage history\n• Reviewing summaries of previous doctor visits\n• Accessing your digital MediKiosk Patient Card\n• Exploring your interactive Medical Timeline`;
      }
    }

    // Apply medical safety guard boundary
    const finalAnswer = SafetyGuard.applySafetyBoundaries(answer, language);

    return {
      text: finalAnswer,
      recordReferences
    };
  }
}

module.exports = ResponseGenerator;
