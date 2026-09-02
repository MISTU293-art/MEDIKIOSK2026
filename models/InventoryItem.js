const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  batchNumber: { type: String, required: true },
  category: { type: String, default: 'Medicine' },
  quantity: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  expiryDate: Date,
  supplier: String,
  updatedAt: { type: Date, default: Date.now }
});
const MongooseInventory = mongoose.model('InventoryItem', inventorySchema);
class InventoryAdapter {
  static async find(query = {}) { if (isLiveMongo()) return MongooseInventory.find(query).sort({ name: 1 }); const list = await memoryDb.getCollection('InventoryItem').find(query); return list.sort((a, b) => a.name.localeCompare(b.name)); }
  static async findById(id) { if (isLiveMongo()) return MongooseInventory.findById(id); return memoryDb.getCollection('InventoryItem').findById(id); }
  static async create(data) { if (isLiveMongo()) return MongooseInventory.create(data); return memoryDb.getCollection('InventoryItem').create(data); }
  static async findByIdAndUpdate(id, update) { if (isLiveMongo()) return MongooseInventory.findByIdAndUpdate(id, update, { new: true }); return memoryDb.getCollection('InventoryItem').findByIdAndUpdate(id, update, { new: true }); }
}
module.exports = InventoryAdapter;