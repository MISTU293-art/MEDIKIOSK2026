const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../config/constants");
const { isLiveMongo, memoryDb } = require("../config/db");

// Delete old compiled model if exists
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.STAFF },
  department: { type: String, default: "General Medicine" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Single pre-save hook for password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    if (
      !this.password.startsWith("$2a$") &&
      !this.password.startsWith("$2b$")
    ) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  if (this.password === candidatePassword) return true; // Direct plain text match fallback
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (e) {
    return false;
  }
};

const MongooseUser = mongoose.model("User", userSchema);

class UserAdapter {
  static async findOne(query) {
    const cleanQuery = {};
    for (let k in query) {
      if (typeof query[k] === "string" && k === "email") {
        cleanQuery[k] = query[k].toLowerCase().trim();
      } else {
        cleanQuery[k] = query[k];
      }
    }

    if (isLiveMongo()) {
      return MongooseUser.findOne(cleanQuery);
    }

    const user = await memoryDb.getCollection("User").findOne(cleanQuery);
    if (!user) return null;
    return {
      ...user,
      comparePassword: async (candidate) => {
        if (!user.password || !candidate) return false;
        if (user.password === candidate) return true;
        try {
          return await bcrypt.compare(candidate, user.password);
        } catch (e) {
          return false;
        }
      },
    };
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseUser.findById(id);
    return memoryDb.getCollection("User").findById(id);
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongooseUser.find(query).sort({ createdAt: -1 });
    return memoryDb.getCollection("User").find(query);
  }

  static async create(userData) {
    const email = (userData.email || "").toLowerCase().trim();
    if (isLiveMongo()) {
      return MongooseUser.create({ ...userData, email });
    }

    let hashedPassword = userData.password;
    if (
      !hashedPassword.startsWith("$2a$") &&
      !hashedPassword.startsWith("$2b$")
    ) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }
    const record = { ...userData, email, password: hashedPassword };
    return memoryDb.getCollection("User").create(record);
  }

  static async findByIdAndUpdate(id, update, opts) {
    if (isLiveMongo()) return MongooseUser.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection("User").findByIdAndUpdate(id, update, opts);
  }

  static async updateOne(query, update) {
    if (isLiveMongo()) return MongooseUser.updateOne(query, update);
    return memoryDb.getCollection("User").updateOne(query, update);
  }

  static async deleteMany(query = {}) {
    if (isLiveMongo()) return MongooseUser.deleteMany(query);
    const col = memoryDb.getCollection("User");
    col.data.clear();
    return { deletedCount: 0 };
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseUser.countDocuments(query);
    return memoryDb.getCollection("User").countDocuments(query);
  }
}

module.exports = UserAdapter;
