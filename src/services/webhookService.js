/**
 * Webhook Service
 * Handles webhook notifications for questionnaire submissions
 */

import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * Triggers a webhook with retry logic
 * @param {Object} data - Data to send to webhook
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<boolean>} Success status
 */
export async function triggerWebhook(data, maxRetries = 3) {
    const webhookUrl = config.webhook.url;

    // Skip if webhook URL is not configured
    if (!webhookUrl) {
        logger.debug("Webhook URL not configured, skipping webhook trigger");
        return false;
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`Triggering webhook (attempt ${attempt}/${maxRetries})`, {
                userId: data.user_id,
                url: webhookUrl,
            });

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Webhook responded with status ${response.status}: ${errorText}`);
            }

            logger.info("Webhook triggered successfully", {
                userId: data.user_id,
                attempt,
            });

            return true;
        } catch (error) {
            lastError = error;
            logger.warn(`Webhook attempt ${attempt} failed`, {
                error: error.message,
                userId: data.user_id,
            });

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    logger.error("Webhook failed after all retry attempts", {
        error: lastError.message,
        userId: data.user_id,
        maxRetries,
    });

    return false;
}

export default {
    triggerWebhook,
};
