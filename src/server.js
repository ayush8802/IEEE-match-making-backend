/**
 * Express Server Application
 * Main server file with middleware and route configuration
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Initialize Express app
const app = express();
const httpServer = createServer(app);

/**
 * Middleware Configuration
 */

// CORS - Allow requests from frontend
// Use a function to handle origin matching with/without trailing slash
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        // Normalize both the configured origin and incoming origin (remove trailing slash)
        const normalizedConfigOrigin = config.cors.origin.replace(/\/$/, '');
        const normalizedIncomingOrigin = origin.replace(/\/$/, '');
        
        if (normalizedConfigOrigin === normalizedIncomingOrigin) {
            callback(null, true);
        } else {
            logger.warn("CORS blocked request", {
                incomingOrigin: origin,
                normalizedIncoming: normalizedIncomingOrigin,
                configuredOrigin: config.cors.origin,
                normalizedConfig: normalizedConfigOrigin,
            });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: config.cors.credentials,
}));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logger (development only)
if (config.server.isDevelopment) {
    app.use((req, res, next) => {
        logger.debug(`${req.method} ${req.path}`, {
            query: req.query,
            body: req.body && Object.keys(req.body).length > 0 ? "present" : "empty",
        });
        next();
    });
}

/**
 * API Routes
 */
app.use("/api/v1", routes);

// Legacy health check for backward compatibility
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend is running",
        timestamp: new Date().toISOString(),
    });
});

/**
 * Error Handling
 */

// 404 handler - must come after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

/**
 * Socket.io Setup
 */
const io = new Server(httpServer, {
    cors: {
        // Socket.io also needs normalized origin handling
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            const normalizedConfigOrigin = config.cors.origin.replace(/\/$/, '');
            const normalizedIncomingOrigin = origin.replace(/\/$/, '');
            if (normalizedConfigOrigin === normalizedIncomingOrigin) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: config.cors.credentials,
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
});

import { setupSocket } from "./socket/socketHandler.js";
setupSocket(io);

/**
 * Server Startup
 */
const PORT = config.server.port;

const server = httpServer.listen(PORT, () => {
    logger.info(`Server started successfully`, {
        port: PORT,
        env: config.server.env,
        corsOrigin: config.cors.origin,
    });
});

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    server.close(() => {
        logger.info("Server closed");
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
