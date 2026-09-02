const crypto = require('crypto');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const StaffCard = require('../models/StaffCard');
const Attendance = require('../models/Attendance');
const Ward = require('../models/Ward');
const Bed = require('../models/Bed');
const logger = require('../utils/logger');

const opaqueId = (prefix) => `${prefix}-${crypto.randomBytes(18).toString('hex')}`;
const startOfDay = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };

exports.getStaffCards = async (req, res) => {
  const users = await User.find({ role: { $in: ['staff', 'doctor', 'pharmacist'] } });
  const cards = await StaffCard.find({});
  res.render('admin/staffCards', { title: 'Staff Identity Cards', user: req.user, users, cards });
};

exports.issueStaffCard = async (req, res) => {
  const staff = await User.findById(req.body.userId);
  if (!staff || !['staff', 'doctor', 'pharmacist'].includes(staff.role)) return res.status(404).json({ success: false, error: 'Eligible staff member not found.' });
  await StaffCard.updateMany({ userId: String(staff._id), status: 'active' }, { status: 'revoked', revokedAt: new Date(), revokedReason: 'Superseded by reissue' });
  const card = await StaffCard.create({ userId: String(staff._id), cardId: opaqueId('SC'), issuedBy: String(req.user.id), status: 'active' });
  logger.audit('STAFF_CARD_ISSUED', req.user.email, { cardId: card.cardId, staffId: staff._id });
  res.json({ success: true, card });
};

exports.revokeStaffCard = async (req, res) => {
  const card = await StaffCard.findOne({ cardId: req.body.cardId, status: 'active' });
  if (!card) return res.status(404).json({ success: false, error: 'Active staff card not found.' });
  await StaffCard.findByIdAndUpdate(card._id, { status: 'revoked', revokedAt: new Date(), revokedReason: String(req.body.reason || 'Revoked by administrator').trim() });
  logger.audit('STAFF_CARD_REVOKED', req.user.email, { cardId: card.cardId });
  res.json({ success: true });
};

exports.getAttendance = async (req, res) => {
  const records = await Attendance.find({});
  const users = await User.find({});
  res.render('admin/attendance', { title: 'Staff Attendance', user: req.user, records, users });
};

exports.getAttendanceTerminal = (req, res) => res.render('attendance/terminal', { title: 'Staff Attendance Terminal', user: req.user });

exports.scanAttendance = async (req, res) => {
  const cardId = String(req.body.cardId || '').trim();
  const card = await StaffCard.findOne({ cardId, status: 'active' });
  if (!card) { logger.audit('ATTENDANCE_INVALID_CARD', req.ip, { cardId }); return res.status(403).json({ success: false, error: 'Invalid or inactive staff card.' }); }
  const staff = await User.findById(card.userId);
  if (!staff || !staff.active) return res.status(403).json({ success: false, error: 'Staff account is inactive.' });
  const todays = await Attendance.find({ userId: String(staff._id), timestamp: { $gte: startOfDay() } });
  const action = todays.length && todays[0].action === 'in' ? 'out' : 'in';
  const record = await Attendance.create({ userId: String(staff._id), cardId, action, terminalId: String(req.body.terminalId || 'attendance-terminal'), ipAddress: req.ip });
  logger.audit(`STAFF_CLOCK_${action.toUpperCase()}`, req.user.email, { staffId: staff._id, cardId, attendanceId: record._id });
  res.json({ success: true, action, staff: { name: staff.name, role: staff.role, department: staff.department }, timestamp: record.timestamp });
};

exports.getBeds = async (req, res) => {
  const wards = await Ward.find({});
  const beds = await Bed.find({});
  const patients = await Patient.find({ status: { $in: ['queued', 'in_consultation'] } });
  res.render('beds/index', { title: 'Live Bed Board', user: req.user, wards, beds, patients });
};

exports.createWard = async (req, res) => {
  if (!String(req.body.name || '').trim()) return res.status(400).json({ success: false, error: 'Ward name is required.' });
  const ward = await Ward.create({ name: String(req.body.name).trim(), department: String(req.body.department || '').trim() });
  logger.audit('WARD_CREATED', req.user.email, { wardId: ward._id });
  res.json({ success: true, ward });
};

exports.createBed = async (req, res) => {
  if (!req.body.wardId || !String(req.body.bedNumber || '').trim()) return res.status(400).json({ success: false, error: 'Ward and bed number are required.' });
  const bed = await Bed.create({ wardId: req.body.wardId, bedNumber: String(req.body.bedNumber).trim(), bedType: req.body.bedType || 'General' });
  logger.audit('BED_CREATED', req.user.email, { bedId: bed._id });
  res.json({ success: true, bed });
};

exports.allocateBed = async (req, res) => {
  const bed = await Bed.findById(req.body.bedId);
  const patient = await Patient.findById(req.body.patientId);
  if (!bed || bed.status !== 'available') return res.status(409).json({ success: false, error: 'Bed is not available.' });
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found.' });
  const visits = await Visit.find({ patientId: String(patient._id) });
  const visit = visits[0];
  if (!visit) return res.status(400).json({ success: false, error: 'An active patient visit is required.' });
  const updated = await Bed.findByIdAndUpdate(bed._id, { status: 'occupied', patientId: String(patient._id), visitId: String(visit._id), allocatedBy: String(req.user.id), allocatedAt: new Date(), updatedAt: new Date() });
  logger.audit('BED_ALLOCATED', req.user.email, { bedId: bed._id, patientId: patient._id, visitId: visit._id });
  res.json({ success: true, bed: updated });
};

exports.releaseBed = async (req, res) => {
  const bed = await Bed.findById(req.body.bedId);
  if (!bed) return res.status(404).json({ success: false, error: 'Bed not found.' });
  const updated = await Bed.findByIdAndUpdate(bed._id, { status: 'cleaning', patientId: null, visitId: null, updatedAt: new Date() });
  logger.audit('BED_RELEASED', req.user.email, { bedId: bed._id });
  res.json({ success: true, bed: updated });
};

exports.markBedAvailable = async (req, res) => {
  const bed = await Bed.findById(req.body.bedId);
  if (!bed || bed.status !== 'cleaning') return res.status(409).json({ success: false, error: 'Only cleaning beds can be marked available.' });
  const updated = await Bed.findByIdAndUpdate(bed._id, { status: 'available', updatedAt: new Date() });
  logger.audit('BED_MARKED_AVAILABLE', req.user.email, { bedId: bed._id });
  res.json({ success: true, bed: updated });
};

exports.getStaffCardPrint = async (req, res) => {
  const card = await StaffCard.findOne({ cardId: req.params.cardId, status: 'active' });
  if (!card) return res.status(404).send('Active staff card not found.');
  const member = await User.findById(card.userId);
  if (!member) return res.status(404).send('Staff account not found.');
  res.render('admin/staffCardPrint', { title: 'Print Staff Identity Card', user: req.user, card, member });
};

exports.getMyStaffCard = async (req, res) => {
  const card = await StaffCard.findOne({ userId: String(req.user.id), status: 'active' });
  if (!card) return res.status(404).render('partials/error', { title: 'Staff Card Not Issued', message: 'No active staff ID card has been issued. Please contact the administrator.', user: req.user });
  const member = await User.findById(req.user.id);
  res.render('admin/staffCardPrint', { title: 'My Staff Identity Card', user: req.user, card, member });
};