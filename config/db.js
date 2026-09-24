const mongoose = require("mongoose");
const logger = require("../utils/logger");

let isConnected = false;

// Robust In-Memory DB Collection for fail-safe fallback & testing
class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.data = new Map();
  }

  _matches(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        const matchesOr = val.some(subQuery => this._matches(doc, subQuery));
        if (!matchesOr) return false;
        continue;
      }
      if (val instanceof RegExp) {
        if (!val.test(String(doc[key] || ''))) return false;
      } else if (typeof val === 'object' && val !== null) {
        if (val.$ne !== undefined && doc[key] === val.$ne) return false;
        if (val.$in !== undefined && (!Array.isArray(val.$in) || !val.$in.includes(doc[key]))) return false;
      } else {
        if (String(doc[key] ?? '') !== String(val ?? '')) return false;
      }
    }
    return true;
  }

  async find(query = {}) {
    const results = [];
    for (const item of this.data.values()) {
      if (this._matches(item, query)) {
        results.push({ ...item });
      }
    }
    return results;
  }

  async findOne(query = {}) {
    for (const item of this.data.values()) {
      if (this._matches(item, query)) {
        return { ...item };
      }
    }
    return null;
  }

  async findById(id) {
    if (!id) return null;
    const strId = String(id);
    const item = this.data.get(strId);
    return item ? { ...item } : null;
  }

  async create(doc) {
    const _id = doc._id ? String(doc._id) : new mongoose.Types.ObjectId().toString();
    const newDoc = {
      ...doc,
      _id,
      id: _id,
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.data.set(_id, newDoc);
    return { ...newDoc };
  }

  async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (!id) return null;
    const strId = String(id);
    const existing = this.data.get(strId);
    if (!existing) return null;
    const updates = update.$set ? { ...update.$set } : { ...update };
    delete updates.$set;
    const updatedDoc = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.data.set(strId, updatedDoc);
    return opts.new ? { ...updatedDoc } : { ...existing };
  }

  async updateOne(query, update) {
    const match = await this.findOne(query);
    if (!match) return { matchedCount: 0, modifiedCount: 0 };
    await this.findByIdAndUpdate(match._id, update);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteMany(query = {}) {
    let deletedCount = 0;
    for (const [key, item] of Array.from(this.data.entries())) {
      if (this._matches(item, query)) {
        this.data.delete(key);
        deletedCount++;
      }
    }
    return { deletedCount };
  }

  async countDocuments(query = {}) {
    const list = await this.find(query);
    return list.length;
  }
}

class MemoryDb {
  constructor() {
    this.collections = new Map();
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection(name));
    }
    return this.collections.get(name);
  }
}

const memoryDb = new MemoryDb();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      logger.warn("MONGODB_URI not configured. Operating in high-performance MemoryDB mode.");
      isConnected = false;
      return null;
    }

    mongoose.set("strictQuery", false);

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    isConnected = true;

    logger.info("========================================");
    logger.info("✅ MongoDB Connected Successfully");
    logger.info("Host: " + connection.connection.host);
    logger.info("Database: " + connection.connection.name);
    logger.info("========================================");

    return connection;

  } catch (err) {
    isConnected = false;

    logger.warn("========================================");
    logger.warn("⚠️ MongoDB Live Connection Unavailable. Fallback to MemoryDB activated.");
    logger.warn(err.message);
    logger.warn("========================================");

    return null;
  }
};

const getStatus = () => ({
  connected: isConnected,
  mode: isConnected ? "MongoDB Server" : "In-Memory Resilient DB",
  timestamp: new Date().toISOString(),
});

module.exports = {
  connectDB,
  getStatus,
  isLiveMongo: () => isConnected,
  memoryDb,
};