const { v4: uuidv4 } = require('uuid');

const DEFAULT_DEPARTMENT = 'Ayurveda (Kayachikitsa & Panchakarma)';

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function normalizeIdentifier(value) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function validateRegistration(data) {
  const fullName = String(data.fullName || '').trim();
  const age = Number(data.age);
  const phone = normalizePhone(data.phone);
  const gender = String(data.gender || '').toLowerCase();
  const errors = {};

  if (fullName.length < 2) errors.fullName = 'Please enter the patient\'s full name.';
  if (!Number.isInteger(age) || age < 0 || age > 120) errors.age = 'Please enter a valid age between 0 and 120.';
  if (!['male', 'female', 'other'].includes(gender)) errors.gender = 'Please select a valid gender.';
  if (!/^\d{10}$/.test(phone)) errors.phone = 'Please enter a valid 10-digit mobile number.';

  return { valid: Object.keys(errors).length === 0, errors, fullName, age, phone, gender };
}

async function nextToken(Patient) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const count = await Patient.countDocuments({ createdAt: { $gte: start } });
  return `AYUSH-${101 + count}`;
}

function createIdentifiers() {
  const suffix = uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
  return {
    uhid: `UHID-AYUSH-${suffix}`,
    cardNumber: `MKC-${suffix.slice(0, 6)}`
  };
}

function maskAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX-XXXX-${digits.slice(-4)}` : '';
}

module.exports = { DEFAULT_DEPARTMENT, normalizePhone, normalizeIdentifier, validateRegistration, nextToken, createIdentifiers, maskAadhaar };