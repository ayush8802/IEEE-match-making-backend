/**
 * Questionnaire Controller
 * Handles business logic for questionnaire operations
 */

import supabase, { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";
import { triggerWebhook } from "../services/webhookService.js";

/**
 * Allowed questionnaire response fields
 */
const ALLOWED_FIELDS = [
    "role",
    "affiliation",
    "seniority",
    "linkedin_url",
    "researcher_ids",
    "core_research_areas",
    "subfields_domains",
    "problems_top_questions",
    "goals_outcomes",
    "top_3_collab_topics",
    "evaluation_metrics",
    "experimental_scale",
    "standards_protocols",
    "seeking",
    "offering",
    "collaborator_background",
    "data_sharing_constraints",
    "ip_licensing_stance",
    "claude_recommendation",
    "lama_recommendation",
    "anthropic_recommendation",
    "mutual_recommendation",
];

/**
 * Save or update questionnaire response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function saveQuestionnaire(req, res, next) {
    try {
        const authUser = req.user;
        const answers = req.body.answers || {};

        logger.info("Saving questionnaire", { userId: authUser.id });

        // Fetch full user info using Supabase Admin
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(authUser.id);
        if (error || !data?.user) {
            throw new ApiError(404, "User not found");
        }

        const user = data.user;

        // Build formatted object with allowed fields
        const formatted = {};

        // Handle problems_top_questions array
        if (answers.problems_top_questions && Array.isArray(answers.problems_top_questions)) {
            formatted.problems_top_questions = answers.problems_top_questions;
        }

        // Copy other allowed fields
        for (const key of ALLOWED_FIELDS) {
            if (key === "problems_top_questions") continue;

            if (key in answers) {
                const value = answers[key];
                if (Array.isArray(value)) {
                    formatted[key] = value;
                } else if (typeof value === "object" && value !== null) {
                    formatted[key] = value;
                } else {
                    formatted[key] = value ?? null;
                }
            }
        }

        // Set name and email from user metadata
        formatted.name = user.user_metadata?.full_name || null;
        formatted.email = user.email || null;

        // Check if user already has a response
        const { data: existing, error: selectError } = await supabase
            .from("questionnaire_responses")
            .select("id")
            .eq("user_id", authUser.id)
            .maybeSingle();

        if (selectError) {
            throw new ApiError(500, `Database query failed: ${selectError.message}`);
        }

        let savedRecord;

        if (existing) {
            // Update existing record
            formatted.updated_at = new Date().toISOString();

            const { data: updateData, error: updateError } = await supabase
                .from("questionnaire_responses")
                .update(formatted)
                .eq("user_id", authUser.id)
                .select()
                .single();

            if (updateError) {
                throw new ApiError(500, `Failed to update questionnaire: ${updateError.message}`);
            }

            savedRecord = updateData;
            logger.info("Questionnaire updated", { userId: authUser.id });
        } else {
            // Insert new record
            const payload = { user_id: authUser.id, ...formatted };

            const { data: insertData, error: insertError } = await supabase
                .from("questionnaire_responses")
                .insert([payload])
                .select()
                .single();

            if (insertError) {
                throw new ApiError(500, `Failed to save questionnaire: ${insertError.message}`);
            }

            savedRecord = insertData;
            logger.info("Questionnaire created", { userId: authUser.id });
        }

        // Trigger webhook asynchronously (don't wait for it)
        if (savedRecord) {
            triggerWebhook(savedRecord).catch((err) => {
                logger.error("Webhook trigger failed", err);
            });
        }

        res.json({
            success: true,
            message: existing ? "Updated successfully" : "Inserted successfully",
            data: savedRecord,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get current user's questionnaire response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function getQuestionnaire(req, res, next) {
    try {
        const authUser = req.user;

        logger.debug("Fetching questionnaire", { userId: authUser.id });

        const { data, error } = await supabase
            .from("questionnaire_responses")
            .select("*")
            .eq("user_id", authUser.id)
            .maybeSingle();

        if (error) {
            throw new ApiError(500, `Failed to fetch questionnaire: ${error.message}`);
        }

        res.json({
            success: true,
            data: data || null,
        });
    } catch (err) {
        next(err);
    }
}

export default {
    saveQuestionnaire,
    getQuestionnaire,
};
