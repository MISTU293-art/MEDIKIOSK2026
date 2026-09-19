const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema(
  {
    uhid: {
      type: String,
      required: true,
      unique: true,
    },

    cardNumber: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    aadhaar: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
    },

    tokenNumber: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
    },

    assignedDoctorName: {
      type: String,
      default: "",
    },

    assignedDoctorQualification: {
      type: String,
      default: "",
    },

    assignedDoctorId: {
      type: String,
      default: "",
    },

    roomNumber: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["Normal", "High", "Emergency", "Emergency Red-Flag"],
      default: "Emergency",
    },

    prioritySource: {
      type: String,
      enum: ["system", "doctor", "red_flag_system", "emergency_registration"],
      default: "emergency_registration",
    },

    status: {
      type: String,
      enum: ["queued", "in-progress", "completed", "cancelled"],
      default: "queued",
    },

    registrationSource: {
      type: String,
      default: "emergency_kiosk",
    },
  },
  {
    timestamps: true,
  },
);

const EmergencyModel = mongoose.model("Emergency", emergencySchema);

module.exports = EmergencyModel;
