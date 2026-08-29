const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;
let memoryStore = null;

// Built-in resilient memory adapter if local Mongo is unavailable
class MockCollection {
  constructor(name) {
    this.name = name;
    this.data = new Map();
  }

  async find(query = {}) {
    let items = Array.from(this.data.values());
    return items.filter(item => this.matchQuery(item, query));
  }

  async findOne(query = {}) {
    const items = await this.find(query);
    return items[0] || null;
  }

  async findById(id) {
    return this.data.get(String(id)) || null;
  }

  async create(doc) {
    const _id = doc._id || new mongoose.Types.ObjectId().toString();
    const newDoc = {
      ...doc,
      _id,
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date(),
      toObject: function() { return { ...this }; },
      save: async function() { return this; }
    };
    this.data.set(String(_id), newDoc);
    return newDoc;
  }

  async insertMany(docs) {
    const results = [];
    for (const doc of docs) {
      results.push(await this.create(doc));
    }
    return results;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    let item = this.data.get(String(id));
    if (!item) return null;
    let updated = { ...item, ...(update.$set || update), updatedAt: new Date() };
    this.data.set(String(id), updated);
    return updated;
  }

  async updateOne(query, update) {
    const item = await this.findOne(query);
    if (!item) return { modifiedCount: 0 };
    const updated = { ...item, ...(update.$set || update), updatedAt: new Date() };
    this.data.set(String(item._id), updated);
    return { modifiedCount: 1 };
  }

  async deleteOne(query) {
    const item = await this.findOne(query);
    if (item) {
      this.data.delete(String(item._id));
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }

  matchQuery(item, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (let key in query) {
      if (key === '$or' && Array.isArray(query.$or)) {
        const anyMatch = query.$or.some(subQuery => this.matchQuery(item, subQuery));
        if (!anyMatch) return false;
        continue;
      }
      if (query[key] instanceof RegExp) {
        if (!query[key].test(String(item[key] || ''))) return false;
      } else if (typeof query[key] === 'object' && query[key] !== null) {
        if (query[key].$ne !== undefined && item[key] === query[key].$ne) return false;
        if (query[key].$in !== undefined && !query[key].$in.includes(item[key])) return false;
      } else if (item[key] !== query[key]) {
        return false;
      }
    }
    return true;
  }
}

class ResilientDataStore {
  constructor() {
    this.collections = new Map();
  }
  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }
}

const memoryDb = new ResilientDataStore();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medikiosk';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    isConnected = true;
    logger.info('MongoDB Connected successfully to: ' + uri);
  } catch (err) {
    isConnected = false;
    logger.warn('MongoDB connection failed or not running locally (' + err.message + '). Enabling resilient embedded in-memory data store for seamless operation.');
  }
};

const getStatus = () => ({
  connected: isConnected,
  mode: isConnected ? 'MongoDB Server' : 'Resilient In-Memory Store',
  timestamp: new Date().toISOString()
});

module.exports = {
  connectDB,
  getStatus,
  memoryDb,
  isLiveMongo: () => isConnected
};
