/**
 * Questionnaire Routes
 * Defines routes for questionnaire operations
 */

import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { validateQuestionnaireSave } from "../middleware/validateRequest.js";
import {
    saveQuestionnaire,
    getQuestionnaire,
} from "../controllers/questionnaireController.js";

const router = express.Router();

/**
 * POST /api/v1/questionnaire/save
 * Save or update questionnaire response
 * @requires Authentication
 * @validates Request body
 */
router.post("/save", requireAuth, validateQuestionnaireSave, saveQuestionnaire);

/**
 * GET /api/v1/questionnaire/me
 * Get current user's questionnaire response
 * @requires Authentication
 */
router.get("/me", requireAuth, getQuestionnaire);

export default router;
