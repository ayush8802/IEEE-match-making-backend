/**
 * Contact Routes
 * Defines routes for contact form operations
 */

import express from "express";
import { submitContact } from "../controllers/contactController.js";

const router = express.Router();

/**
 * POST /api/v1/contact
 * Submit contact form
 * @public - No authentication required
 */
router.post("/", submitContact);

export default router;



