# MediKiosk 2026: National AYUSH Digital Health & AI Patient Portal System

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.22-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208.9-green.svg)](https://www.mongodb.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Progressive%20Web%20App-purple.svg)](public/manifest.json)
[![ABDM Compatible](https://img.shields.io/badge/ABDM-Ayushman%20Bharat%20Ready-orange.svg)](https://abdm.gov.in/)
[![Accessibility](https://img.shields.io/badge/WCAG-Senior%20Citizen%20Mode-yellow.svg)](public/js/seniorMode.js)
[![Tests Passing](https://img.shields.io/badge/Tests-100%25%20Verified-success.svg)](test/)

MediKiosk 2026 is an enterprise-grade, multilingual, AI-assisted healthcare workflow system built for government healthcare institutions, hospital OPDs, and National AYUSH health facilities. It unifies self-service reception intake terminals, a secure patient portal with an AI health assistant, a clinician consultation workspace, a pharmacy dispensing hub with drug-allergy contraindication shields, inpatient bed boards, staff attendance tracking, and administrative governance.

---

## Table of Contents

1. [System Architecture & Core Highlights](#1-system-architecture--core-highlights)
2. [Portals & Clinical Workspaces](#2-portals--clinical-workspaces)
   - [Multilingual Reception Kiosk](#21-multilingual-reception-kiosk)
   - [Patient Portal & AI Health Assistant](#22-patient-portal--ai-health-assistant)
   - [Doctor Consultation Workspace & Patient 360](#23-doctor-consultation-workspace--patient-360)
   - [OPD Staff Registration & Triage Desk](#24-opd-staff-registration--triage-desk)
   - [Hospital Pharmacy, Dispensation & Inventory](#25-hospital-pharmacy-dispensation--inventory)
   - [Live Ward & Bed Board Management](#26-live-ward--bed-board-management)
   - [Super Admin Command Center & Staff Attendance](#27-super-admin-command-center--staff-attendance)
3. [Patient Portal & AI Health Assistant (Sections 43–74)](#3-patient-portal--ai-health-assistant-sections-4374)
   - [Personal Health Dashboard & Identifiers](#31-personal-health-dashboard--identifiers)
   - [Clinical Records & Medical Timeline](#32-clinical-records--medical-timeline)
   - [Record-Aware AI Health Assistant Engine](#33-record-aware-ai-health-assistant-engine)
   - [Emergency Detection & Immediate Escalation](#34-emergency-detection--immediate-escalation)
   - [Clinical Safety Guardrails](#35-clinical-safety-guardrails)
   - [Patient Authentication & Boundary Isolation](#36-patient-authentication--boundary-isolation)
4. [Senior Citizen & Accessibility System (`senior-mode`)](#4-senior-citizen--accessibility-system-senior-mode)
5. [Universal Navigation & Back Switcher System](#5-universal-navigation--back-switcher-system)
6. [Progressive Web Application (PWA) & Mobile UX](#6-progressive-web-application-pwa--mobile-ux)
7. [Security, Privacy & Data Governance](#7-security-privacy--data-governance)
8. [Demo Credentials & Test Accounts](#8-demo-credentials--test-accounts)
9. [Complete Route Directory & API Reference](#9-complete-route-directory--api-reference)
10. [Configuration & Environment Variables](#10-configuration--environment-variables)
11. [Installation & Quick Start](#11-installation--quick-start)
12. [Verification & Test Suites](#12-verification--test-suites)
13. [Project Directory Structure](#13-project-directory-structure)

---

## 1. System Architecture & Core Highlights

MediKiosk is structured with a layered MVC architecture powered by Express.js, MongoDB, and server-rendered EJS templates with client-side Progressive Web App (PWA) capabilities.

```
                              ┌─────────────────────────────────────────┐
                              │            MEDIKIOSK 2026               │
                              └────────────────────┬────────────────────┘
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
         │                   │                     │                     │                   │
┌────────▼─────────┐┌────────▼─────────┐  ┌────────▼─────────┐  ┌────────▼─────────┐┌────────▼─────────┐
│ Self-Service     ││ Patient Portal   │  │ Doctor Clinical  │  │ Pharmacy Hub     ││ Ward & Admin     │
│ Reception Kiosk  ││ & AI Assistant   │  │ & Patient 360    │  │ & Dispensation   ││ Management       │
├──────────────────┤├──────────────────┤  ├──────────────────┤  ├──────────────────┤├──────────────────┤
│• 10s Express Reg ││• Digital Card    │  │• Active Queue    │  │• AI Allergy Flag ││• Bed Allocation  │
│• 8-Step Wizard   ││• Visit Summaries │  │• Red-Flag Triage │  │• Barcode Scan    ││• Staff QR Badges │
│• Ayushman / ABHA ││• Lab & Reports   │  │• Prescriptions   │  │• Batch Inventory ││• Attendance Clock│
│• Multi-language  ││• Record-Aware AI │  │• Lab Ordering    │  │• Stock Receiving ││• Excel Export    │
│• Senior Mode     ││• Timeline View   │  │• Copilot Assist  │  │• Real-time Bill  ││• Audit Logging   │
└──────────────────┘└──────────────────┘  └──────────────────┘  └──────────────────┘└──────────────────┘
         │                   │                     │                     │                   │
         └───────────────────┴─────────────────────┼─────────────────────┴───────────────────┘
                                                   │
                                ┌──────────────────▼──────────────────┐
                                │       CORE SERVICE LAYER            │
                                ├─────────────────────────────────────┤
                                │ • AI Clinical Copilot & OCR Engine  │
                                │ • Record-Aware Assistant & Tools    │
                                │ • Emergency Triaging (EN/HI/BN)     │
                                │ • ImageKit CDN / Local Fallback     │
                                │ • JWT Auth & Rate Limit Shield      │
                                └──────────────────┬──────────────────┘
                                                   │
                                ┌──────────────────▼──────────────────┐
                                │       MONGODB DATABASE LAYER        │
                                │  21 Schemas (Patients, Visits,      │
                                │  Reports, Accounts, Prescriptions)  │
                                └─────────────────────────────────────┘
```

---

## 2. Portals & Clinical Workspaces

### 2.1 Multilingual Reception Kiosk
* **Accessible via:** `/kiosk`
* **Features:**
  * **10-Second Express Registration:** Fast-track walk-in intake requiring only Name, Age, Gender, Mobile Number, and Department. Automatically creates the patient profile, assigns an OPD Queue Token, generates a Digital Patient Card, and provisions a Patient Portal Account.
  * **8-Step Comprehensive Wizard (`/kiosk/intake`):** Structured case-taking covering Demographics, Chief Complaints, Severity Scale, Medical History, Allergies, Ongoing Medications, Family History, and Lifestyle Factors.
  * **Step Switcher Pills (1 to 8):** Walk-in patients can jump between steps, review previous answers, or submit early directly from Step 1.
  * **Ayushman Bharat / ABHA Check-In:** Dedicated lookup tab supporting ABHA ID, 12-digit Aadhaar (masked), UHID, or registered mobile number.
  * **Senior Citizen Mode:** Large font display (`1.18rem`), high-contrast layout, 54px+ touch targets, and Text-to-Speech audio guidance.

### 2.2 Patient Portal & AI Health Assistant
* **Accessible via:** `/patient/login` or `/patient/dashboard`
* **Features:**
  * Personal digital healthcare dashboard authenticated via mobile number, UHID, card number, or email.
  * Comprehensive access to verified records: Digital Patient Card, Visits, Reports, Prescriptions, Medicine History, Lab Results, Allergies, and Chronological Medical Timeline.
  * Interactive AI Health Assistant with safe, record-aware tool retrieval and urgent emergency triage.
  * Cross-platform Progressive Web App (PWA) with offline asset caching and mobile navigation.

### 2.3 Doctor Consultation Workspace & Patient 360
* **Accessible via:** `/doctor/queue`
* **Features:**
  * Live consultation queue categorized by urgency: Emergency Red-Flag, Priority, and Routine.
  * Complete Patient 360 view displaying vital signs, previous visit summaries, historical prescriptions, and uploaded test documents.
  * Digital Prescription writer with automated dosage, frequency, duration, and lab investigation orders.
  * AI Clinical Copilot providing differential diagnosis hints, symptom cross-referencing, and red-flag alerts.
  * Reports & Tests manager (`/doctor/reports`) with real-time status tracking (`requested`, `uploaded`, `under_review`, `reviewed`).

### 2.4 OPD Staff Registration & Triage Desk
* **Accessible via:** `/staff/dashboard`
* **Features:**
  * Rapid patient check-in and queue token generation for walk-in patients.
  * Document upload station with Multer and OCR preview for physical paper prescriptions and external lab slips.
  * Demographic verification and ABHA scheme linkage.

### 2.5 Hospital Pharmacy, Dispensation & Inventory
* **Accessible via:** `/pharmacy`
* **Features:**
  * Prescription retrieval by patient card number or token.
  * **AI Drug-Allergy Contraindication Shield:** Cross-checks prescribed medications against patient allergy records before dispensing.
  * Real-time inventory tracking with batch numbers, expiry monitoring, low-stock warnings, and reorder levels.
  * Stock Delivery intake panel (`Receive Delivery`) capturing invoice number, supplier, vehicle/truck number, delivery person, and batch count.
  * Automated billing receipt generation with pricing calculation.

### 2.6 Live Ward & Bed Board Management
* **Accessible via:** `/beds`
* **Features:**
  * Live bed board showing occupancy states: `available`, `occupied`, `cleaning`, `reserved`, and `out_of_service`.
  * Inpatient admission and discharge workflows tied directly to patient visit records.
  * Visual status badges and transition logging for housekeeping and nursing teams.

### 2.7 Super Admin Command Center & Staff Attendance
* **Accessible via:** `/admin/dashboard`
* **Features:**
  * Institutional user management (role assignment, account locking, password resets).
  * Paginated Patient Directory (`/admin/patients`) with search and one-click Excel-compatible `.xls` export.
  * **Staff QR Identity Cards (`/admin/staff-cards`):** Issue and revoke cryptographically opaque QR identity badges.
  * **Staff Attendance Terminal (`/attendance`):** Contactless clock-in/out station scanning staff QR cards with server-derived punch status.
  * Comprehensive audit logging (`/admin/audit-logs`) tracking security and clinical events.

---

## 3. Patient Portal & AI Health Assistant (Sections 43–74)

The Patient Portal serves as the patient's personal digital healthcare compass. It implements strict tenant isolation, ensuring patients can only view and interact with their own medical records.

### 3.1 Personal Health Dashboard & Identifiers
* **UHID & Patient Card:** Clean digital card display with masked mobile numbers, issue timestamps, and high-visibility identifiers.
* **ABHA & PM-JAY Integration:** Displays linked ABHA address and scheme eligibility status (e.g., *PM-JAY Golden Card Holder ₹5 Lakh Cover*).
* **Identifier-Only Barcode & QR Code:** The SVG barcode and QR code encode only safe tokens (`MKC-XXXXXX`). Medical diagnoses and private clinical details are never embedded in the QR payload.

### 3.2 Clinical Records & Medical Timeline
* **Visits (`/patient/visits`):** History of previous OPD visits, attending doctor notes, department routing, and visit statuses.
* **Reports (`/patient/reports`):** Diagnostic lab slips, radiology scans, and pathology reports. Includes an **"Explain with AI"** button that translates medical jargon into plain English or Hindi.
* **Prescriptions (`/patient/prescriptions`):** Attending physician orders with medication names, dosages, instructions, and follow-up consultation dates.
* **Medicine History (`/patient/medicines`):** Categorized into **Current Active**, **Completed**, and **Previous** medications with duration counters.
* **Allergies (`/patient/allergies`):** Known drug, food, and environmental hypersensitivities prominently flagged with severity levels.
* **Lab Results (`/patient/labs`):** Numerical laboratory parameters (e.g., Hemoglobin, Fasting Blood Sugar, Platelet Count) displaying reference ranges and color-coded abnormal indicators (`Normal`, `Low`, `High`).
* **Medical Timeline (`/patient/timeline`):** Unified chronological event stream grouping visits, lab orders, and prescriptions by year.

### 3.3 Record-Aware AI Health Assistant Engine
Located under `services/ai/`, the assistant delivers conversational healthcare guidance while strictly referencing the patient's authenticated clinical history.

```
       Patient Message: "What medications am I currently taking?"
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │    services/ai/patientAssistant │
                 │      • Context Sanitization     │
                 │      • Multilingual Detection   │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │ services/ai/emergencyDetector   │ ── Urgent Emergency? ──► Immediate 108 / Staff Alert
                 └────────────────┬────────────────┘                          (Halts normal processing)
                                  │ Safe Query
                                  ▼
                 ┌─────────────────────────────────┐
                 │  services/ai/patientRecordTools │
                 │   • getPatientProfile()         │
                 │   • getPrescriptions()          │
                 │   • getMedicineHistory()        │
                 │   • getLatestReports()          │
                 │   • getLabResults()             │
                 │   • getAllergies()              │
                 │   • getMedicalTimeline()        │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │ services/ai/responseGenerator   │
                 │   • Injects safe record data    │
                 │   • Formats Markdown responses  │
                 │   • Appends record link buttons │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │    services/ai/safetyGuard      │
                 │   • Strips diagnosis attempts   │
                 │   • Blocks prescription updates │
                 │   • Ensures legal disclaimers   │
                 └─────────────────────────────────┘
```

#### Tool Capabilities:
* `getPatientProfile`: Accesses demographic data, blood group, emergency contact, and UHID.
* `getLatestReports`: Retrieves recent lab test orders, diagnostic statuses, and clinician review notes.
* `getPrescriptions`: Gathers active and past prescription details.
* `getMedicineHistory`: Categorizes active vs. past drugs.
* `getAllergies`: Returns documented drug sensitivities.
* `getLabResults`: Extracts lab test results and reference ranges.
* `getMedicalTimeline`: Surfaces chronological health events.

### 3.4 Emergency Detection & Immediate Escalation
The engine features regex-based pattern matching in English, Hindi, and Bengali:
* **Monitored Symptoms:** Severe chest pain, crushing chest pressure, suspected heart attack, acute shortness of breath, severe uncontrolled bleeding, signs of stroke (facial droop, arm weakness, slurred speech), and anaphylaxis.
* **Immediate Response:** Bypasses conversational filler and displays an urgent red-alert banner with direct links to call **108 Ambulance** or notify attending hospital staff immediately.
* **Audit Logging:** Logs all detected emergency triggers in `logs/audit.log` for clinical risk monitoring.

### 3.5 Clinical Safety Guardrails
* **Non-Diagnosis Disclaimer:** Every AI response includes: *"Advisory only. This assistant does not diagnose medical conditions, prescribe treatment, or replace an authorized healthcare professional."*
* **Prescription Shield:** The assistant will not generate medication dosages or recommend changing pharmaceutical regimens.
* **Advisory Verification:** AI explanations of complex lab reports prompt patients to discuss findings with their doctor during follow-up.

### 3.6 Patient Authentication & Boundary Isolation
* **Authentication Options:**
  1. 10-digit Mobile Phone Number + Password
  2. Institutional UHID + Password
  3. Patient Card Number + Password
  4. Registered Email Address + Password
* **Auto-Provisioning:** Kiosk express registrations automatically create a linked `PatientAccount` with default credentials (`patient123`).
* **Rate Limiting & Account Security:**
  * IP and account-based rate limiting (10 attempts per 15-minute window).
  * 5 consecutive failed attempts trigger a temporary 15-minute account lock.
  * Passwords hashed using `bcryptjs` with 10 salt rounds.
  * Signed JWT stored in the HTTP-only `medikiosk_patient_token` cookie.
* **Strict Tenant Boundary:** Every database query in `patientRecordService` filters explicitly by `patientId: req.patient._id`. Cross-patient record access is blocked at the controller level.

---

## 4. Senior Citizen & Accessibility System (`senior-mode`)

MediKiosk provides an inclusive, elderly-friendly user interface compliant with accessibility best practices.

* **One-Click Toggle (`👓 Senior Mode / बड़ा टेक्स्ट`):**
  * Persistent across sessions via browser `localStorage`.
  * Toggled via `window.toggleSeniorMode()` or header controls.
* **Visual Optimizations:**
  * Base typography scaled up to `1.18rem` with `font-weight: 600`.
  * High-contrast black text (`#000000`) on clean light backgrounds.
  * Prominent `2px` solid borders on cards, inputs, and interactive elements.
  * High-visibility outline on form inputs (`:focus-visible` ring).
* **Motor-Friendly Touch Targets:**
  * Buttons have a minimum height of `54px` to `62px`.
  * Form inputs scaled to `58px` height for easy tapping on touchscreens or with tremors.
* **Speech Synthesis (Audio Read-Aloud):**
  * Integrated Web Speech API (`SpeechSynthesis`) in `public/js/seniorMode.js`.
  * Calibrated at a deliberate `0.88x` playback rate for elderly listeners.
  * Native support for English (`en-IN`), Hindi (`hi-IN`), and Bengali (`bn-IN`).
  * Dedicated **"Listen / सुनें"** buttons on the reception kiosk, intake wizard, patient dashboard, and record pages.
* **Instant Emergency Dialing:**
  * Direct 1-tap `tel:108` emergency ambulance button in header navigation and accessibility bars.

---

## 5. Universal Navigation & Back Switcher System

To prevent users from getting trapped in nested subpages, MediKiosk features universal navigation controls:

* **Subpage Sticky Top Switcher (`views/patient/header.ejs`):**
  * Displayed on all portal subpages (`/patient/card`, `/patient/visits`, `/patient/reports`, `/patient/prescriptions`, `/patient/medicines`, `/patient/labs`, `/patient/documents`, `/patient/timeline`, `/patient/allergies`, `/patient/chat`, `/patient/profile`).
  * Contains:
    * `⬅ Back to Dashboard / वापस जाएं`: Instant return to the main dashboard.
    * `‹ Previous Page`: Uses browser `history.back()`.
    * `🔊 Listen Page / सुनें`: Reads page text aloud.
    * `🚨 108 Emergency`: Quick dialer.
* **Dashboard Kiosk Switcher:** Top button on the Patient Dashboard allowing walk-ins to easily return to the reception kiosk terminal.
* **Auth Switchers:** Seamless navigation between Login, Registration, and the Reception Kiosk.
* **Intake Wizard Step Switcher (`views/kiosk/intake.ejs`):**
  * Top navigation bar with 8 jumpable pills: `1. Info`, `2. Symptoms`, `3. Severity`, `4. History`, `5. Allergies`, `6. Medicines`, `7. Family`, `8. Lifestyle`.
  * Top `⬅ Back / वापस` button (`prevStep()`) and quick registration shortcut on Step 1.

---

## 6. Progressive Web Application (PWA) & Mobile UX

MediKiosk is designed as a mobile-first Progressive Web Application.

* **Web App Manifest (`public/manifest.json`):**
  * Configured with `display: standalone` for an app-like fullscreen experience.
  * Defines brand theme colors (`#0284c7`), background colors, and app icons.
  * Provides quick app shortcuts for:
    * *My Patient Card* (`/patient/card`)
    * *AI Health Assistant* (`/patient/chat`)
    * *Medical Reports* (`/patient/reports`)
    * *Kiosk Terminal* (`/kiosk`)
* **Service Worker (`public/sw.js`):**
  * Implements a **Stale-While-Revalidate** caching strategy for static CSS, JavaScript, fonts, and brand assets.
  * Implements a **Network-First with Offline Fallback** strategy for navigation requests.
  * Seamless background cache invalidation on service worker version update (`medikiosk-v2.0.0`).
* **Sticky Mobile Bottom Navigation Bar (`views/patient/footer.ejs`):**
  * Displayed on mobile viewports (`max-width: 768px`).
  * Features thumb-reachable items:
    * `Home` (`/patient/dashboard`)
    * `Card` (`/patient/card`)
    * `Records` (`/patient/visits`)
    * `Reports` (`/patient/reports`)
    * `AI Health` (Elevated circular floating action button `/patient/chat`)
    * `Profile` (`/patient/profile`)
  * Dynamic body padding (`padding-bottom: 74px`) prevents bottom controls from obscuring page content.

---

## 7. Security, Privacy & Data Governance

* **Zero-PHI QR Codes:** QR codes and Code 128 barcodes contain only opaque card identifiers (`MKC-XXXXXX`). Patient names, Aadhaar numbers, phone numbers, and clinical diagnoses are never stored in barcode payloads.
* **Cryptographic Token Verification:** Patient authentication uses JWT signed with `JWT_ACCESS_SECRET` with configurable expiration. Tokens are stored in HTTP-only, SameSite cookies.
* **Cloud Storage & Local Fallback:** Document uploads support ImageKit.io CDN storage with an automatic fallback to local filesystem storage (`uploads/`).
* **Audit Trail:** Security, administrative, and clinical events are written to `logs/audit.log` and the `RedFlagAudit` collection.
* **Input Sanitization & Validation:** Mongoose schemas validate all incoming parameters to prevent NoSQL injection and blank submissions.

---

## 8. Demo Credentials & Test Accounts

The system automatically initializes verified demo credentials on first startup (`utils/seedData.js`):

| Role | Username / Identifier | Password | Access / Department |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@hospital.org` | `admin123` | Hospital Administration & Command Center |
| **Doctor (General Medicine)** | `doctor@hospital.org` | `doctor123` | OPD Queue, Prescriptions & Patient 360 |
| **Doctor (Cardiology)** | `cardio@hospital.org` | `doctor123` | Cardiology OPD & Clinical Reviews |
| **OPD Reception Staff** | `staff@hospital.org` | `staff123` | OPD Registration Desk & Triage |
| **Hospital Pharmacist** | `pharmacy@hospital.org` | `pharmacy123` | Pharmacy Hub, Billing & Inventory |
| **Demo Patient** | `9830112233` *(or `UHID-880124-12`)* | `patient123` | Patient Portal, AI Assistant & Records |

---

## 9. Complete Route Directory & API Reference

### Patient Portal & AI Routes
| Route Method | Path | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/patient/login` | Public | Patient login screen |
| `POST` | `/patient/login` | Public (Rate Limited) | Authenticates credentials and sets JWT cookie |
| `GET` | `/patient/register` | Public | New patient web registration screen |
| `POST` | `/patient/register` | Public | Registers a patient profile and portal account |
| `GET` | `/patient/logout` | Patient Auth | Clears session cookie and redirects to login |
| `GET` | `/patient/dashboard` | Patient Auth | Personal health dashboard |
| `GET` | `/patient/card` | Patient Auth | Digital Patient Card view |
| `GET` | `/patient/visits` | Patient Auth | Complete visit history |
| `GET` | `/patient/reports` | Patient Auth | Diagnostic test reports & lab slips |
| `GET` | `/patient/prescriptions` | Patient Auth | Doctor prescriptions and instructions |
| `GET` | `/patient/medicines` | Patient Auth | Active, completed, and past medicines |
| `GET` | `/patient/labs` | Patient Auth | Structured lab values & reference ranges |
| `GET` | `/patient/documents` | Patient Auth | Uploaded health documents |
| `GET` | `/patient/timeline` | Patient Auth | Unified chronological health timeline |
| `GET` | `/patient/allergies` | Patient Auth | Documented patient allergies |
| `GET` | `/patient/chat` | Patient Auth | AI Health Assistant interface |
| `GET` | `/patient/profile` | Patient Auth | Profile management and consent status |
| `POST` | `/patient/ai/message` | Patient Auth | Sends message to AI Health Assistant |
| `POST` | `/patient/ai/explain-report/:reportId` | Patient Auth | AI plain-language lab report explanation |
| `GET` | `/api/patient/me` | Patient Auth / API | Full patient record JSON bundle |

### Reception Kiosk Routes
| Route Method | Path | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/kiosk` | Public | Main welcome and check-in terminal |
| `GET` | `/kiosk/intake` | Public | 8-Step multilingual case-taking wizard |
| `POST` | `/kiosk/intake` | Public | Submits completed intake questionnaire |
| `GET` | `/kiosk/summary` | Public | Kiosk intake completion overview |
| `GET` | `/kiosk/card/:id` | Public | Displays verified patient card with barcode |
| `POST` | `/kiosk/lookup` | Public | Searches patient by Mobile, UHID, or Card No. |
| `POST` | `/kiosk/express-register` | Public | 10-Second rapid walk-in registration |
| `GET` | `/kiosk/emergency` | Public | Emergency alert workflow |
| `POST` | `/kiosk/assistant` | Public | Kiosk helper conversational bot |

### Doctor & Clinical Routes
| Route Method | Path | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/doctor/queue` | Doctor / Admin | Live consultation patient queue |
| `GET` | `/doctor/consultation/:id` | Doctor / Admin | Patient 360 clinical workspace |
| `POST` | `/doctor/consultation/:id` | Doctor / Admin | Saves clinical summary and prescription |
| `GET` | `/doctor/reports` | Doctor / Admin | Diagnostic report orders and review desk |
| `POST` | `/doctor/reports/request` | Doctor / Admin | Submits new lab test investigation order |
| `POST` | `/doctor/assistant` | Doctor / Admin | Clinical copilot query endpoint |

### Pharmacy & Staff Routes
| Route Method | Path | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/pharmacy` | Pharmacy Staff / Admin | Pharmacy workspace & prescription search |
| `POST` | `/pharmacy/check-allergy` | Pharmacy Staff / Admin | AI drug-allergy contraindication check |
| `POST` | `/pharmacy/dispense` | Pharmacy Staff / Admin | Dispenses medications and updates stock |
| `POST` | `/pharmacy/receive-stock` | Pharmacy Staff / Admin | Records stock delivery with invoice & batch |
| `GET` | `/staff/dashboard` | Staff / Admin | OPD reception and triage queue |

### Operations, Wards & Admin Routes
| Route Method | Path | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/beds` | Clinical / Admin | Live ward and bed status board |
| `POST` | `/beds/allocate` | Clinical / Admin | Allocates bed to active patient visit |
| `POST` | `/beds/release` | Clinical / Admin | Releases bed into cleaning state |
| `GET` | `/attendance` | Authenticated Staff | Staff attendance clock-in/out terminal |
| `POST` | `/attendance/scan` | Authenticated Staff | Processes staff QR card punch |
| `GET` | `/admin/dashboard` | Super Admin | Administrative analytics & controls |
| `GET` | `/admin/patients` | Super Admin | Patient directory with `.xls` export |
| `GET` | `/admin/staff-cards` | Super Admin | Issue/revoke staff QR identity cards |

---

## 10. Configuration & Environment Variables

Create a `.env` file in the project root:

```env
# Application Settings
PORT=3000
NODE_ENV=development

# Database Connection (Local or MongoDB Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/medikiosk

# Cryptographic JWT Secrets
JWT_ACCESS_SECRET=your_long_random_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_long_random_jwt_refresh_secret_key_here

# ImageKit Cloud Document Storage (Optional - falls back to local uploads/)
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

# AI Provider API Keys (Optional - mock fallbacks included)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Seed Demo Records on First Run
SEED_DEMO_DATA=true
```

---

## 11. Installation & Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/MISTU293-art/MEDIKIOSK2026.git
cd MEDIKIOSK2026
npm install
```

### 2. Configure Environment
Copy or create `.env` as shown in [Configuration](#10-configuration--environment-variables).

### 3. Start the Server
For standard production execution:
```bash
npm start
```
For local development with auto-reloading:
```bash
npm run dev
```

### 4. Access the Applications
* **Reception Kiosk:** `http://localhost:3000/kiosk`
* **Patient Portal Login:** `http://localhost:3000/patient/login`
* **Doctor Queue:** `http://localhost:3000/doctor/queue`
* **Pharmacy Hub:** `http://localhost:3000/pharmacy`
* **Ward Bed Board:** `http://localhost:3000/beds`
* **Staff Attendance:** `http://localhost:3000/attendance`
* **Admin Command Center:** `http://localhost:3000/admin/dashboard`

---

## 12. Verification & Test Suites

MediKiosk includes a comprehensive automated test suite covering unit tests, clinical integration tests, and full HTTP route verification.

### Run All Route Verifications (24 HTTP Endpoints)
```bash
node test/test_all_links_http.js
```
*Tests and confirms `200 OK` across all kiosk pages, patient portal views, PWA manifests, service workers, and accessibility scripts.*

### Run Patient Portal & AI Health Assistant Verification (40 Tests)
```bash
node test/test_patient_portal.js
```
*Verifies bcrypt password authentication, brute-force locking, digital card tokenization, zero-PHI QR payload enforcement, record-aware tool calls, emergency escalation (English/Hindi), and medical safety guardrails.*

### Run Core Clinical & Pharmacy Verification
```bash
node test/verify.js
```
*Validates institutional role authentications, AI drug-allergy contraindication detection, ImageKit CDN services, and pharmacy dispensation records.*

---

## 13. Project Directory Structure

```text
MEDIKIOSK2026/
├── config/
│   ├── auth.js                  # JWT configuration & token signing helpers
│   └── db.js                    # MongoDB connection & resilient fallback logic
├── controllers/
│   ├── adminController.js       # Admin user management & patient export
│   ├── authController.js        # Institutional staff/doctor authentication
│   ├── doctorController.js      # Doctor consultation & patient 360 handlers
│   ├── kioskController.js       # Kiosk registration, wizard & card views
│   ├── operationsController.js   # Wards, bed board & staff attendance
│   ├── patientAiController.js   # AI Health Assistant conversation handlers
│   ├── patientApiController.js  # Patient REST API (/api/patient/me)
│   ├── patientAuthController.js # Patient Portal login, register & rate limiting
│   ├── patientPortalController.js# Patient Portal view controllers
│   └── pharmacyController.js    # Pharmacy dispensing & inventory management
├── middleware/
│   ├── authMiddleware.js        # Institutional RBAC & JWT verification
│   ├── patientAuthMiddleware.js # Patient-specific token & lockout middleware
│   └── uploadMiddleware.js      # Multer file upload handler
├── models/
│   ├── AIConversation.js        # Patient AI assistant chat history
│   ├── AIMessage.js             # Individual AI interaction records
│   ├── Attendance.js            # Staff clock-in/out records
│   ├── Bed.js                   # Inpatient bed occupancy and status
│   ├── ConsultationNote.js      # Doctor clinical summaries & prescriptions
│   ├── DispensationRecord.js    # Pharmacy medicine dispensing logs
│   ├── Document.js              # Uploaded lab slips, reports & OCR data
│   ├── Emergency.js             # Patient emergency triage records
│   ├── IntakeSession.js         # Kiosk 8-step intake questionnaire state
│   ├── InventoryItem.js         # Pharmacy stock, batches & pricing
│   ├── InventoryReceipt.js      # Received medicine deliveries & invoices
│   ├── Kiosk.js                 # Registered kiosk terminal metadata
│   ├── Patient.js               # Core demographic & patient identity model
│   ├── PatientAccount.js        # Portal credentials, password hash & lockouts
│   ├── PatientNotification.js   # SMS/Portal notification records
│   ├── RedFlagAudit.js          # Clinical red-flag triggers & audits
│   ├── Report.js                # Diagnostic lab and imaging reports
│   ├── StaffCard.js             # Cryptographic staff QR badges
│   ├── User.js                  # Doctors, nurses, pharmacists & admins
│   ├── Visit.js                 # Hospital encounters & OPD token sessions
│   └── Ward.js                  # Hospital departments and inpatient wards
├── public/
│   ├── css/
│   │   └── style.css            # Stylesheet with senior-mode & PWA styling
│   ├── js/
│   │   ├── kioskApp.js          # Intake wizard logic, steps & auto-register
│   │   ├── seniorMode.js        # Senior mode toggles & SpeechSynthesis TTS
│   │   └── voiceAssistant.js    # Kiosk speech recognition & audio assistance
│   ├── manifest.json            # PWA Web App Manifest (standalone display)
│   └── sw.js                    # PWA Service Worker (stale-while-revalidate)
├── routes/
│   ├── adminRoutes.js           # Admin routes
│   ├── authRoutes.js            # Institutional auth routes
│   ├── doctorRoutes.js          # Doctor consultation routes
│   ├── documentRoutes.js        # File upload routes
│   ├── kioskRoutes.js           # Kiosk intake & card routes
│   ├── operationsRoutes.js      # Bed board & attendance routes
│   ├── patientAiRoutes.js       # Patient AI health assistant routes
│   ├── patientApiRoutes.js      # Patient JSON API routes
│   ├── patientAuthRoutes.js     # Patient login & registration routes
│   ├── patientPortalRoutes.js   # Patient dashboard & record routes
│   ├── pharmacyRoutes.js        # Pharmacy & dispensing routes
│   ├── staffRoutes.js           # OPD registration desk routes
│   └── syncRoutes.js            # ABDM/External health record sync
├── services/
│   ├── ai/
│   │   ├── conversationEngine.js# AI context builder & prompt generator
│   │   ├── emergencyDetector.js # Emergency triage keyword & regex detector
│   │   ├── patientAssistant.js  # Main record-aware AI agent coordinator
│   │   ├── patientContextBuilder.js # Context aggregator for patient data
│   │   ├── patientRecordTools.js# Safe tool definitions for record queries
│   │   ├── responseGenerator.js # Advisory response formatter & link buttons
│   │   └── safetyGuard.js       # Clinical disclaimer & prescription shield
│   ├── patient/
│   │   ├── patientRecordService.js # Isolated patient data queries
│   │   ├── patientReportService.js # Lab report & AI explanation service
│   │   └── patientTimelineService.js # Chronological timeline builder
│   ├── aiClinicalCopilotService.js # Doctor clinical copilot
│   ├── aiSummaryService.js      # Kiosk intake summary generator
│   ├── imageKitService.js       # Cloud storage with local filesystem fallback
│   ├── ocrService.js            # Document text extraction engine
│   └── translationService.js    # Multilingual translation service
├── test/
│   ├── test_all_links_http.js   # 24-Route full HTTP test suite
│   ├── test_patient_portal.js   # 40-Test Patient Portal & AI test suite
│   └── verify.js                # Core clinical & pharmacy verification
├── utils/
│   ├── logger.js                # Winston/Console logging configuration
│   ├── questionBank.js          # 8-Step multilingual question schemas
│   └── seedData.js              # Database initialization & demo records
├── views/
│   ├── admin/                   # Admin command center & user views
│   ├── doctor/                  # Queue, consultation & report views
│   ├── kiosk/                   # Intake, welcome, card & emergency views
│   ├── partials/                # Headers, footers & modals
│   ├── patient/                 # Patient portal views (Dashboard, Chat, Cards)
│   ├── pharmacy/                # Dispensing & inventory views
│   └── staff/                   # Triage & reception views
├── package.json                 # Project dependencies & scripts
├── README.md                    # System documentation
└── server.js                    # Express application entry point
```

---

## License

MediKiosk 2026 is distributed under the ISC License. Maintained by the MediKiosk Engineering Team for the National AYUSH Digital Health Network.
