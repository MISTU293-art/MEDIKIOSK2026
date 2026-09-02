const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const receiptSchema = new mongoose.Schema({
  inventoryItemId: { type: String, required: true },
  medicineName: { type: String, required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  supplier: String,
  invoiceNumber: String,
  vehicleNumber: String,
  deliveryPerson: String,
  receivedBy: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  notes: String
});
const MongooseReceipt = mongoose.model('InventoryReceipt', receiptSchema);
class InventoryReceiptAdapter {
  static async find(query = {}) { if (isLiveMongo()) return MongooseReceipt.find(query).sort({ receivedAt: -1 }); const list = await memoryDb.getCollection('InventoryReceipt').find(query); return list.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)); }
  static async create(data) { if (isLiveMongo()) return MongooseReceipt.create(data); return memoryDb.getCollection('InventoryReceipt').create(data); }
}
module.exports = InventoryReceiptAdapter;