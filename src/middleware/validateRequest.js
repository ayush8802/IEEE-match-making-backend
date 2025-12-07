/**
 * Request Validation Middleware
 * Validates request body against predefined schemas
 */

import { ApiError } from "./errorHandler.js";

/**
 * Allowed questionnaire response fields
 */
const ALLOWED_QUESTIONNAIRE_FIELDS = [
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
 * Validates questionnaire save request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function validateQuestionnaireSave(req, res, next) {
    try {
        const { answers } = req.body;

        if (!answers || typeof answers !== "object") {
            throw new ApiError(400, "Request body must contain an 'answers' object");
        }

        // Validate that all fields are allowed
        const providedFields = Object.keys(answers);
        const invalidFields = providedFields.filter(
            (field) => !ALLOWED_QUESTIONNAIRE_FIELDS.includes(field)
        );

        if (invalidFields.length > 0) {
            throw new ApiError(
                400,
                `Invalid fields in answers: ${invalidFields.join(", ")}`
            );
        }

        // Validate specific field types
        if (answers.problems_top_questions && !Array.isArray(answers.problems_top_questions)) {
            throw new ApiError(400, "problems_top_questions must be an array");
        }

        if (answers.top_3_collab_topics && !Array.isArray(answers.top_3_collab_topics)) {
            throw new ApiError(400, "top_3_collab_topics must be an array");
        }

        next();
    } catch (err) {
        next(err);
    }
}

export default {
    validateQuestionnaireSave,
};
