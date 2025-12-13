/**
 * Routes Index
 * Central router that combines all route modules
 */

import express from "express";
import questionnaireRoutes from "./questionnaire.js";
import contactRoutes from "./contact.js";
import conversationRoutes from "./conversations.js";

const router = express.Router();

/**
 * API v1 Routes
 */
router.use("/questionnaire", questionnaireRoutes);
router.use("/contact", contactRoutes);
router.use("/conversations", conversationRoutes);

/**
 * Health check endpoint
 */
router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend is running",
        timestamp: new Date().toISOString(),
    });
});

export default router;
