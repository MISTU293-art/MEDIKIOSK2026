const express = require("express");
const http = require("http");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

dotenv.config();

// Global Process Crash Shield
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL_UNCAUGHT_EXCEPTION]", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED_PROMISE_REJECTION]", reason);
});

const { connectDB, getStatus } = require("./config/db");
const logger = require("./utils/logger");
const seedDatabase = require("./utils/seedData");

// Routes
const authRoutes = require("./routes/authRoutes");
const kioskRoutes = require("./routes/kioskRoutes");
const staffRoutes = require("./routes/staffRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const documentRoutes = require("./routes/documentRoutes");
const syncRoutes = require("./routes/syncRoutes");
const operationsRoutes = require("./routes/operationsRoutes");

const app = express();
app.set("trust proxy", 1);
let PORT = Number(process.env.PORT) || 3000;

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Security & Parsing Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Static Assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Health & Status endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    system: "MediKiosk AYUSH Hospital Intake System",
    version: "2.0.0",
    port: PORT,
    db: getStatus(),
    timestamp: new Date().toISOString(),
  });
});

// App Routes
app.get("/", (req, res) => res.redirect("/kiosk"));
app.use("/auth", authRoutes);
app.use("/kiosk", kioskRoutes);
app.use("/staff", staffRoutes);
app.use("/doctor", doctorRoutes);
app.use("/admin", adminRoutes);
app.use("/pharmacy", pharmacyRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/sync", syncRoutes);
app.use("/", operationsRoutes);

// 404 Handler
app.use((req, res) => {
  if (req.accepts("html")) {
    res.status(404).render("partials/error", {
      title: "404 - Page Not Found",
      message: "The requested page or kiosk view does not exist.",
      user: null,
    });
  } else {
    res.status(404).json({ success: false, error: "Endpoint not found." });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error("Unhandled express error: " + (err.stack || err.message));
  if (req.accepts("html")) {
    res.status(500).render("partials/error", {
      title: "500 - System Error",
      message:
        "An unexpected system error occurred: " +
        (err.message || "Please try again"),
      user: null,
    });
  } else {
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal Server Error" });
  }
});

function printBanner(activePort) {
  logger.info(`==================================================`);
  logger.info(`MediKiosk Hospital Intake Server running on port ${activePort}`);
  logger.info(`Kiosk URL:   http://localhost:${activePort}/kiosk`);
  logger.info(`Staff Portal: http://localhost:${activePort}/staff/dashboard`);
  logger.info(`Doctor Queue: http://localhost:${activePort}/doctor/queue`);
  logger.info(`Admin Portal: http://localhost:${activePort}/admin/dashboard`);
  logger.info(`Pharmacy:     http://localhost:${activePort}/pharmacy`);
  logger.info(`==================================================`);
}

// Start Server & Connect Database with Auto-Port Selection Fail-Safe
const startServer = async () => {
  try {
    await connectDB();
    await seedDatabase();

    const server = http.createServer(app);

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        const fallbackPort = PORT + 1;
        logger.warn(
          `Port ${PORT} is occupied by another process. Automatically switching to fallback port ${fallbackPort}...`,
        );
        PORT = fallbackPort;
        server.listen(fallbackPort, () => {
          printBanner(fallbackPort);
        });
      } else {
        logger.error("Server error: " + err.message);
      }
    });

    server.listen(PORT, () => {
      printBanner(PORT);
    });
  } catch (err) {
    logger.error("Fatal error starting MediKiosk server: " + err.message);
  }
};

startServer();
