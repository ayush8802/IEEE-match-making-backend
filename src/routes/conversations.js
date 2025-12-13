/**
 * Conversation Routes
 * Defines routes for conversation operations
 */

import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
    getConversations,
    getConversationMessages,
    markConversationAsRead,
} from "../controllers/conversationController.js";

const router = express.Router();

/**
 * GET /api/v1/conversations
 * Get all conversations for the current user
 * @requires Authentication
 */
router.get("/", requireAuth, getConversations);

/**
 * GET /api/v1/conversations/:conversationId/messages
 * Get messages for a specific conversation
 * @requires Authentication
 */
router.get("/:conversationId/messages", requireAuth, getConversationMessages);

/**
 * POST /api/v1/conversations/:conversationId/read
 * Mark all messages in a conversation as read
 * @requires Authentication
 */
router.post("/:conversationId/read", requireAuth, markConversationAsRead);

export default router;



