/**
 * Message Moderation Service
 * Implements rule-based and AI-based message filtering
 * Ensures safe and appropriate content in chat messages
 */

import { supabase, supabaseAdmin } from "../config/supabase.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";

/**
 * Moderation result structure
 * @typedef {Object} ModerationResult
 * @property {boolean} allowed - Whether the message is allowed
 * @property {string} reason - Reason for blocking (if blocked)
 * @property {string} method - 'rule_based', 'ai_based', or 'fallback'
 * @property {Object} metadata - Additional metadata
 */

/**
 * Rule-based moderation: Check message against blacklist
 * @param {string} messageContent - Message text to check
 * @returns {Promise<ModerationResult>}
 */
async function checkRuleBasedModeration(messageContent) {
    try {
        const normalizedContent = messageContent.toLowerCase().trim();

        // Fetch active blacklist entries
        const { data: blacklist, error } = await supabaseAdmin
            .from("moderation_blacklist")
            .select("word_or_phrase, category")
            .eq("is_active", true);

        if (error) {
            logger.error("Error fetching moderation blacklist", error);
            // If we can't fetch blacklist, allow the message (fail open)
            return {
                allowed: true,
                reason: null,
                method: "fallback",
                metadata: { error: "Blacklist fetch failed" },
            };
        }

        // Check each blacklist entry
        for (const entry of blacklist || []) {
            const phrase = entry.word_or_phrase.toLowerCase();
            if (normalizedContent.includes(phrase)) {
                logger.warn("Message blocked by rule-based filter", {
                    matchedPhrase: entry.word_or_phrase,
                    category: entry.category,
                    messagePreview: messageContent.substring(0, 50),
                });

                return {
                    allowed: false,
                    reason: `Message contains blocked content: "${entry.word_or_phrase}" (category: ${entry.category})`,
                    method: "rule_based",
                    metadata: {
                        matchedPhrase: entry.word_or_phrase,
                        category: entry.category,
                    },
                };
            }
        }

        // Message passed rule-based check
        return {
            allowed: true,
            reason: null,
            method: "rule_based",
            metadata: {},
        };
    } catch (error) {
        logger.error("Error in rule-based moderation", error);
        // Fail open - allow message if check fails
        return {
            allowed: true,
            reason: null,
            method: "fallback",
            metadata: { error: error.message },
        };
    }
}

/**
 * AI-based moderation using OpenAI API
 * @param {string} messageContent - Message text to check
 * @returns {Promise<ModerationResult>}
 */
async function checkAIModeration(messageContent) {
    const openAIApiKey = process.env.OPENAI_API_KEY;

    // If no API key, skip AI check
    if (!openAIApiKey) {
        logger.debug("OpenAI API key not configured, skipping AI moderation");
        return null;
    }

    try {
        const moderationPrompt = `You are a content moderation system for a professional academic networking platform. Your task is to classify the following message as either "Allowed" or "Blocked".

BLOCK the message if it contains:
1. Explicit sexual content, sexual references, or sexual slang
2. Harassment, bullying, or abusive language
3. Coercion, manipulation, or pressure for unwanted interactions
4. Requests for private meetings, off-platform communication, or requests for personal contact information (phone, WhatsApp, Telegram, email addresses, addresses, etc.)
5. Requests to meet in private locations (hotel rooms, private residences, etc.)

ALLOW the message if it:
- Is professional, respectful, and appropriate for academic/professional networking
- Discusses research, collaboration, or professional topics
- Contains no inappropriate content or requests

Message to classify: "${messageContent}"

Respond with ONLY one word: either "Allowed" or "Blocked". If blocked, include a brief reason after a colon, like: "Blocked: contains request for private meeting"`;

        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAIApiKey}`,
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a strict content moderation system. You must classify messages as either 'Allowed' or 'Blocked' based on the provided criteria.",
                    },
                    {
                        role: "user",
                        content: moderationPrompt,
                    },
                ],
                temperature: 0, // Low temperature for consistent classification
                max_tokens: 100,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            logger.error("OpenAI API error", {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
            });
            return null; // Fall back to rule-based
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content?.trim() || "";

        logger.debug("AI moderation response", { aiResponse });

        // Parse response
        const isBlocked = aiResponse.toLowerCase().startsWith("blocked");
        const reason = isBlocked
            ? aiResponse.substring(aiResponse.indexOf(":") + 1).trim() || "AI classified as inappropriate"
            : null;

        return {
            allowed: !isBlocked,
            reason: reason,
            method: "ai_based",
            metadata: {
                aiResponse: aiResponse,
                model: data.model,
                usage: data.usage,
            },
        };
    } catch (error) {
        logger.error("Error in AI-based moderation", error);
        // Fail gracefully - return null to use rule-based fallback
        return null;
    }
}

/**
 * Main moderation function
 * Runs rule-based check first, then AI check if enabled
 * @param {string} messageContent - Message text to moderate
 * @returns {Promise<ModerationResult>}
 */
export async function moderateMessage(messageContent) {
    if (!messageContent || typeof messageContent !== "string") {
        logger.warn("Invalid message content for moderation", { messageContent });
        return {
            allowed: false,
            reason: "Invalid message content",
            method: "fallback",
            metadata: {},
        };
    }

    // Step 1: Rule-based check (always runs first, fastest)
    const ruleBasedResult = await checkRuleBasedModeration(messageContent);

    // If blocked by rule-based, return immediately
    if (!ruleBasedResult.allowed) {
        return ruleBasedResult;
    }

    // Step 2: AI-based check (optional, only if rule-based passed)
    // Check if AI moderation is enabled
    const useAI = process.env.ENABLE_AI_MODERATION === "true";

    if (useAI) {
        const aiResult = await checkAIModeration(messageContent);

        // If AI check succeeded, use its result
        if (aiResult) {
            return aiResult;
        }

        // If AI check failed (null), fall back to rule-based result
        logger.warn("AI moderation failed, using rule-based result");
        return ruleBasedResult;
    }

    // AI moderation disabled, use rule-based result
    return ruleBasedResult;
}

/**
 * Log moderation decision to database
 * @param {Object} params
 * @param {string} params.messageId - Message ID (if message was saved before moderation)
 * @param {string} params.senderId - Sender user ID
 * @param {string} params.receiverId - Receiver user ID
 * @param {string} params.messageContent - Original message content
 * @param {ModerationResult} params.result - Moderation result
 * @returns {Promise<void>}
 */
export async function logModerationDecision({ messageId, senderId, receiverId, messageContent, result }) {
    try {
        const { error } = await supabaseAdmin.from("moderation_logs").insert({
            message_id: messageId || null,
            sender_id: senderId,
            receiver_id: receiverId,
            message_content: messageContent,
            moderation_result: result.allowed ? "allowed" : "blocked",
            moderation_method: result.method,
            blocked_reason: result.reason || null,
            ai_response: result.metadata?.aiResponse ? { response: result.metadata.aiResponse } : null,
            timestamp: new Date().toISOString(),
            email_sent: result.allowed ? false : false, // Will be updated when email is sent
        });

        if (error) {
            logger.error("Error logging moderation decision", error);
        } else {
            logger.debug("Moderation decision logged", {
                allowed: result.allowed,
                method: result.method,
            });
        }
    } catch (error) {
        logger.error("Error logging moderation decision", error);
    }
}


