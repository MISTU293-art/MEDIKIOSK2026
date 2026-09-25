const express = require("express");
const http = require("http");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

dotenv.config();

/* =========================================================
   PROCESS ERROR HANDLING
========================================================= */

process.on("uncaughtException", (error) => {
    console.error(
        "[CRITICAL_UNCAUGHT_EXCEPTION]",
        error
    );
});

process.on("unhandledRejection", (reason) => {
    console.error(
        "[UNHANDLED_PROMISE_REJECTION]",
        reason
    );
});


/* =========================================================
   APPLICATION SERVICES
========================================================= */

const {
    connectDB,
    getStatus
} = require("./config/db");

const logger = require("./utils/logger");

const seedDatabase = require("./utils/seedData");


/* =========================================================
   ROUTES
========================================================= */

const authRoutes = require("./routes/authRoutes");
const kioskRoutes = require("./routes/kioskRoutes");
const staffRoutes = require("./routes/staffRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");

const documentRoutes = require("./routes/documentRoutes");
const syncRoutes = require("./routes/syncRoutes");
const operationsRoutes = require("./routes/operationsRoutes");

const patientAuthRoutes = require("./routes/patientAuthRoutes");
const patientPortalRoutes = require("./routes/patientPortalRoutes");
const patientAiRoutes = require("./routes/patientAiRoutes");
const patientApiRoutes = require("./routes/patientApiRoutes");


/* =========================================================
   APP INITIALIZATION
========================================================= */

const app = express();

app.set("trust proxy", 1);

app.set(
    "views",
    path.join(__dirname, "views")
);

app.set(
    "view engine",
    "ejs"
);


/* =========================================================
   SERVER CONFIGURATION
========================================================= */

let PORT =
    Number(process.env.PORT) || 3000;


/* =========================================================
   SECURITY
========================================================= */

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);


/* =========================================================
   CORS
========================================================= */

app.use(
    cors({
        origin: true,
        credentials: true
    })
);


/* =========================================================
   REQUEST PARSERS
========================================================= */

app.use(cookieParser());

app.use(
    express.json({
        limit: "20mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb"
    })
);


/* =========================================================
   STATIC FILES
========================================================= */

/*
    Everything inside:

        public/

    is available from:

        /

    Examples:

        public/manifest.json
        -> /manifest.json

        public/sw.js
        -> /sw.js

        public/offline.html
        -> /offline.html

        public/uploads/new_logo.png
        -> /uploads/new_logo.png
*/

app.use(
    express.static(
        path.join(__dirname, "public"),
        {
            index: false,
            extensions: ["html"]
        }
    )
);


/*
    Explicit uploads route.

    public/uploads/
    ->
    /uploads/
*/

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "public",
            "uploads"
        )
    )
);


/* =========================================================
   PWA MANIFEST
========================================================= */

app.get(
    "/manifest.json",
    (req, res) => {

        res.type("application/manifest+json");

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "manifest.json"
            )
        );
    }
);


/* =========================================================
   SERVICE WORKER
========================================================= */

/*
    Keep /sw.js at the root.

    A root-level service worker can control
    the entire MediKiosk application.
*/

app.get(
    "/sw.js",
    (req, res) => {

        res.type("application/javascript");

        res.set(
            "Cache-Control",
            "no-cache, no-store, must-revalidate"
        );

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "sw.js"
            )
        );
    }
);


/* =========================================================
   OFFLINE PAGE
========================================================= */

app.get(
    "/offline.html",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "offline.html"
            )
        );
    }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.status(200).json({

            success: true,

            status: "healthy",

            system:
                "MediKiosk AYUSH Hospital Intake System",

            version: "2.0.0",

            port: PORT,

            db: getStatus(),

            timestamp:
                new Date().toISOString()

        });
    }
);


/* =========================================================
   ROOT
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.redirect("/kiosk");

    }
);


/* =========================================================
   AUTHENTICATION
========================================================= */

app.use(
    "/auth",
    authRoutes
);


/* =========================================================
   PATIENT KIOSK
========================================================= */

app.use(
    "/kiosk",
    kioskRoutes
);


/* =========================================================
   STAFF
========================================================= */

app.use(
    "/staff",
    staffRoutes
);


/* =========================================================
   DOCTOR
========================================================= */

app.use(
    "/doctor",
    doctorRoutes
);


/* =========================================================
   ADMIN
========================================================= */

app.use(
    "/admin",
    adminRoutes
);


/* =========================================================
   PHARMACY
========================================================= */

app.use(
    "/pharmacy",
    pharmacyRoutes
);


/* =========================================================
   DOCUMENT API
========================================================= */

app.use(
    "/api/documents",
    documentRoutes
);


/* =========================================================
   SYNC API
========================================================= */

app.use(
    "/api/sync",
    syncRoutes
);


/* =========================================================
   PATIENT AUTHENTICATION
========================================================= */

app.use(
    "/patient",
    patientAuthRoutes
);


/* =========================================================
   PATIENT PORTAL
========================================================= */

app.use(
    "/patient",
    patientPortalRoutes
);


/* =========================================================
   PATIENT AI ASSISTANT
========================================================= */

app.use(
    "/patient/ai",
    patientAiRoutes
);


/* =========================================================
   PATIENT API
========================================================= */

app.use(
    "/api/patient",
    patientApiRoutes
);


/* =========================================================
   OPERATIONS
========================================================= */

app.use(
    "/",
    operationsRoutes
);


/* =========================================================
   404 HANDLER
========================================================= */

app.use(
    (req, res) => {

        const acceptsHtml =
            req.accepts("html");

        if (acceptsHtml) {

            return res
                .status(404)
                .render(
                    "partials/error",
                    {
                        title:
                            "404 - Page Not Found",

                        message:
                            "The requested page or kiosk view does not exist.",

                        user: null
                    }
                );
        }


        return res
            .status(404)
            .json({
                success: false,
                error:
                    "Endpoint not found."
            });
    }
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (err, req, res, next) => {

        logger.error(
            "Unhandled Express error: " +
            (
                err.stack ||
                err.message ||
                err
            )
        );


        /*
            If Express has already started
            sending the response, pass the
            error to the default handler.
        */

        if (res.headersSent) {

            return next(err);

        }


        if (req.accepts("html")) {

            return res
                .status(500)
                .render(
                    "partials/error",
                    {
                        title:
                            "500 - System Error",

                        message:
                            "An unexpected system error occurred: " +
                            (
                                err.message ||
                                "Please try again"
                            ),

                        user: null
                    }
                );
        }


        return res
            .status(500)
            .json({

                success: false,

                error:
                    err.message ||
                    "Internal Server Error"

            });
    }
);


/* =========================================================
   SERVER BANNER
========================================================= */

function printBanner(activePort) {

    logger.info(
        "=================================================="
    );

    logger.info(
        `MediKiosk Hospital Intake Server running on port ${activePort}`
    );

    logger.info(
        `Kiosk URL:      http://localhost:${activePort}/kiosk`
    );

    logger.info(
        `Patient Portal: http://localhost:${activePort}/patient/dashboard`
    );

    logger.info(
        `Patient Login:  http://localhost:${activePort}/patient/login`
    );

    logger.info(
        `Staff Portal:   http://localhost:${activePort}/staff/dashboard`
    );

    logger.info(
        `Doctor Queue:   http://localhost:${activePort}/doctor/queue`
    );

    logger.info(
        `Admin Portal:   http://localhost:${activePort}/admin/dashboard`
    );

    logger.info(
        `Pharmacy:       http://localhost:${activePort}/pharmacy`
    );

    logger.info(
        `Health API:     http://localhost:${activePort}/api/health`
    );

    logger.info(
        `Manifest:       http://localhost:${activePort}/manifest.json`
    );

    logger.info(
        `Service Worker: http://localhost:${activePort}/sw.js`
    );

    logger.info(
        "=================================================="
    );
}


/* =========================================================
   START SERVER
========================================================= */

async function startServer() {

    try {

        /* -----------------------------------------------
           DATABASE CONNECTION
        ------------------------------------------------ */

        await connectDB();


        /* -----------------------------------------------
           DATABASE SEED
        ------------------------------------------------ */

        await seedDatabase();


        /* -----------------------------------------------
           HTTP SERVER
        ------------------------------------------------ */

        const server =
            http.createServer(app);


        /* -----------------------------------------------
           SERVER ERROR
        ------------------------------------------------ */

        server.on(
            "error",
            (err) => {

                if (
                    err.code ===
                    "EADDRINUSE"
                ) {

                    const fallbackPort =
                        PORT + 1;


                    logger.warn(
                        `Port ${PORT} is already occupied.`
                    );


                    logger.warn(
                        `Switching automatically to port ${fallbackPort}...`
                    );


                    PORT =
                        fallbackPort;


                    server.listen(
                        fallbackPort,
                        () => {

                            printBanner(
                                fallbackPort
                            );

                        }
                    );


                    return;
                }


                logger.error(
                    "Server error: " +
                    (
                        err.stack ||
                        err.message
                    )
                );
            }
        );


        /* -----------------------------------------------
           START LISTENING
        ------------------------------------------------ */

        server.listen(
            PORT,
            () => {

                printBanner(PORT);

            }
        );

    } catch (error) {

        logger.error(
            "Fatal error starting MediKiosk server: " +
            (
                error.stack ||
                error.message
            )
        );

        process.exit(1);
    }
}


/* =========================================================
   START APPLICATION
========================================================= */

startServer();