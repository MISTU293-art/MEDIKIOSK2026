/* =========================================================
   MediKiosk AYUSH
   Progressive Web App Service Worker
   Version 3.0.0
========================================================= */

const CACHE_NAME = "medikiosk-static-v3";
const OFFLINE_URL = "/offline.html";

/*
 * Only cache PUBLIC / SAFE assets here.
 *
 * Do NOT cache:
 * - patient dashboards
 * - doctor pages
 * - admin pages
 * - staff pages
 * - reports
 * - prescriptions
 * - API responses
 * - authentication pages
 * - private patient information
 */
const STATIC_ASSETS = [
    "/offline.html",
    "/manifest.json",

    "/css/style.css",

    "/js/kioskApp.js",
    "/js/seniorMode.js",
    "/js/offlineSync.js",

    "/uploads/new_logo.png",
    "/uploads/logo.png",

    "/uploads/web-app-manifest-192x192.png",
    "/uploads/web-app-manifest-512x512.png",

    "/favicon.ico",
    "/favicon.svg"
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", (event) => {

    console.log("[SW] Installing:", CACHE_NAME);

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(async (cache) => {

                /*
                 * Cache each file independently.
                 * One missing asset will not break installation.
                 */

                for (const asset of STATIC_ASSETS) {

                    try {

                        const response =
                            await fetch(asset, {
                                cache: "no-cache"
                            });

                        if (
                            response.ok &&
                            response.status === 200
                        ) {

                            await cache.put(
                                asset,
                                response
                            );

                            console.log(
                                "[SW] Cached:",
                                asset
                            );

                        } else {

                            console.warn(
                                "[SW] Could not cache:",
                                asset,
                                response.status
                            );

                        }

                    } catch (error) {

                        console.warn(
                            "[SW] Cache failed:",
                            asset,
                            error.message
                        );

                    }
                }

            })

            .then(() => {

                /*
                 * Activate the new service worker
                 * immediately.
                 */

                return self.skipWaiting();

            })
    );
});


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", (event) => {

    console.log("[SW] Activating:", CACHE_NAME);

    event.waitUntil(

        caches.keys()

            .then((cacheNames) => {

                return Promise.all(

                    cacheNames.map((cacheName) => {

                        if (
                            cacheName !== CACHE_NAME
                        ) {

                            console.log(
                                "[SW] Removing old cache:",
                                cacheName
                            );

                            return caches.delete(
                                cacheName
                            );
                        }

                        return null;
                    })

                );

            })

            .then(() => {

                /*
                 * Take control of currently open pages.
                 */

                return self.clients.claim();

            })

    );
});


/* =========================================================
   HELPER: IS PRIVATE ROUTE?
========================================================= */

function isPrivateRoute(pathname) {

    const privateRoutes = [

        "/admin",
        "/doctor",
        "/staff",
        "/patient",
        "/pharmacy",

        "/auth",

        "/api",

        "/reports",

        "/operations"

    ];

    return privateRoutes.some(
        (route) =>
            pathname === route ||
            pathname.startsWith(route + "/")
    );
}


/* =========================================================
   HELPER: IS PUBLIC STATIC ASSET?
========================================================= */

function isStaticAsset(request) {

    return (

        request.destination === "style" ||

        request.destination === "script" ||

        request.destination === "image" ||

        request.destination === "font"

    );
}


/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", (event) => {

    const request = event.request;

    /*
     * Service workers should only handle GET.
     */

    if (request.method !== "GET") {
        return;
    }


    const url = new URL(request.url);


    /*
     * Ignore non-HTTP protocols.
     */

    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {
        return;
    }


    /* =====================================================
       API / AUTH / PRIVATE DATA
    ===================================================== */

    if (
        url.origin === self.location.origin &&
        (
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/auth") ||
            url.pathname.startsWith("/patient") ||
            url.pathname.startsWith("/doctor") ||
            url.pathname.startsWith("/staff") ||
            url.pathname.startsWith("/admin") ||
            url.pathname.startsWith("/pharmacy")
        )
    ) {

        /*
         * IMPORTANT:
         *
         * Do NOT cache healthcare data.
         *
         * Always use the network.
         */

        event.respondWith(

            fetch(request)

                .catch(() => {

                    return new Response(

                        JSON.stringify({
                            success: false,
                            offline: true,
                            error:
                                "You are currently offline. Please reconnect to continue."
                        }),

                        {
                            status: 503,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }

                    );

                })

        );

        return;
    }


    /* =====================================================
       STATIC LOCAL ASSETS
    ===================================================== */

    if (
        url.origin === self.location.origin &&
        isStaticAsset(request)
    ) {

        event.respondWith(

            caches.open(CACHE_NAME)

                .then(async (cache) => {

                    const cached =
                        await cache.match(request);


                    const network =
                        fetch(request)

                            .then((response) => {

                                if (
                                    response &&
                                    response.ok
                                ) {

                                    cache.put(
                                        request,
                                        response.clone()
                                    );

                                }

                                return response;

                            })

                            .catch(() => null);


                    /*
                     * Return cached asset immediately.
                     * Network updates the cache in background.
                     */

                    return (
                        cached ||
                        await network
                    );

                })

        );

        return;
    }


    /* =====================================================
       IMAGES
    ===================================================== */

    if (
        url.origin === self.location.origin &&
        request.destination === "image"
    ) {

        event.respondWith(

            caches.open(CACHE_NAME)

                .then(async (cache) => {

                    const cached =
                        await cache.match(request);

                    if (cached) {
                        return cached;
                    }

                    try {

                        const response =
                            await fetch(request);

                        if (
                            response.ok
                        ) {

                            cache.put(
                                request,
                                response.clone()
                            );

                        }

                        return response;

                    } catch (error) {

                        /*
                         * Return a transparent fallback
                         * rather than breaking the page.
                         */

                        return new Response(
                            "",
                            {
                                status: 503
                            }
                        );

                    }

                })

        );

        return;
    }


    /* =====================================================
       KIOSK PUBLIC PAGES
    ===================================================== */

    const isKioskPage =
        url.origin === self.location.origin &&
        (
            url.pathname === "/kiosk" ||
            url.pathname === "/kiosk/" ||
            url.pathname === "/kiosk/emergency"
        );


    if (isKioskPage) {

        event.respondWith(

            fetch(request)

                .then((response) => {

                    /*
                     * Cache public kiosk pages only.
                     */

                    if (
                        response &&
                        response.ok
                    ) {

                        caches.open(CACHE_NAME)
                            .then((cache) => {

                                cache.put(
                                    request,
                                    response.clone()
                                );

                            });

                    }

                    return response;

                })

                .catch(async () => {

                    const cached =
                        await caches.match(request);

                    if (cached) {
                        return cached;
                    }

                    return getOfflinePage();

                })

        );

        return;
    }


    /* =====================================================
       OFFLINE PAGE
    ===================================================== */

    if (
        url.pathname === OFFLINE_URL
    ) {

        event.respondWith(

            caches.match(
                OFFLINE_URL
            )

        );

        return;
    }


    /* =====================================================
       OTHER HTML PAGES
    ===================================================== */

    if (
        request.mode === "navigate" ||
        request.destination === "document"
    ) {

        /*
         * IMPORTANT:
         *
         * We do NOT cache private HTML pages.
         *
         * Network first.
         * Offline -> offline page.
         */

        event.respondWith(

            fetch(request)

                .catch(async () => {

                    return getOfflinePage();

                })

        );

        return;
    }


    /* =====================================================
       EXTERNAL CDN
    ===================================================== */

    if (
        url.origin !== self.location.origin
    ) {

        /*
         * Let browser handle external resources.
         *
         * This avoids problems with caching
         * cross-origin CDN resources.
         */

        return;
    }


    /* =====================================================
       DEFAULT
    ===================================================== */

    event.respondWith(

        fetch(request)

            .catch(async () => {

                const cached =
                    await caches.match(request);

                return (
                    cached ||
                    getOfflinePage()
                );

            })

    );

});


/* =========================================================
   OFFLINE PAGE HELPER
========================================================= */

async function getOfflinePage() {

    const cache =
        await caches.open(
            CACHE_NAME
        );

    const offlinePage =
        await cache.match(
            OFFLINE_URL
        );

    if (offlinePage) {

        return offlinePage;

    }


    /*
     * Last-resort offline response.
     */

    return new Response(

        `
        <!DOCTYPE html>

        <html lang="en">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
            >

            <meta
                name="theme-color"
                content="#0B5CFF"
            >

            <title>MediKiosk Offline</title>

            <style>

                body {
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8faff;
                    font-family:
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                .card {
                    width: min(90%, 430px);
                    background: white;
                    border-radius: 18px;
                    padding: 32px;
                    text-align: center;
                    box-shadow:
                        0 10px 40px
                        rgba(0, 0, 0, .10);
                }

                .logo {
                    width: 72px;
                    height: 72px;
                    object-fit: contain;
                    margin-bottom: 18px;
                }

                h2 {
                    margin: 0 0 10px;
                    color: #111827;
                }

                p {
                    color: #6b7280;
                    line-height: 1.6;
                }

                .btn {
                    display: inline-block;
                    margin-top: 15px;
                    padding: 11px 20px;
                    border-radius: 10px;
                    background: #0B5CFF;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                }

                .emergency {
                    background: #dc3545;
                    margin-left: 6px;
                }

            </style>

        </head>

        <body>

            <div class="card">

                <img
                    class="logo"
                    src="/uploads/new_logo.png"
                    alt="MediKiosk"
                >

                <h2>
                    MediKiosk Offline
                </h2>

                <p>
                    You are currently offline.
                    Please reconnect to continue
                    accessing hospital services.
                </p>

                <a
                    href="/kiosk"
                    class="btn"
                >
                    Try Again
                </a>

                <a
                    href="tel:108"
                    class="btn emergency"
                >
                    Emergency 108
                </a>

            </div>

        </body>

        </html>
        `,

        {
            status: 503,

            headers: {
                "Content-Type":
                    "text/html; charset=utf-8"
            }

        }

    );
}


/* =========================================================
   SERVICE WORKER MESSAGE API
========================================================= */

self.addEventListener(
    "message",
    (event) => {

        if (
            event.data &&
            event.data.type === "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);