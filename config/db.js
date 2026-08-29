const mongoose = require("mongoose");
const logger = require("../utils/logger");

let isConnected = false;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error(
        "MONGODB_URI environment variable is not configured"
      );
    }

    mongoose.set("strictQuery", false);

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
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

    logger.error("========================================");
    logger.error("❌ MongoDB Connection Failed");
    logger.error(err.message);
    logger.error("========================================");

    throw err;
  }
};

const getStatus = () => ({
  connected: isConnected,
  mode: isConnected ? "MongoDB Server" : "Disconnected",
  timestamp: new Date().toISOString(),
});

module.exports = {
  connectDB,
  getStatus,
  isLiveMongo: () => isConnected,
};