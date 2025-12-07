/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */

import supabase from "../config/supabase.js";
import { ApiError } from "./errorHandler.js";
import logger from "../utils/logger.js";

/**
 * Middleware to require authentication
 * Validates the JWT token from Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export default async function requireAuth(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new ApiError(401, "Authorization header is required");
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            throw new ApiError(401, "Invalid authorization header format. Expected: Bearer <token>");
        }

        const token = parts[1];

        if (!token) {
            throw new ApiError(401, "Access token is required");
        }

        // Validate token with Supabase
        const { data: authData, error: authError } = await supabase.auth.getUser(token);

        if (authError) {
            logger.warn("Token validation failed", { error: authError.message });
            throw new ApiError(401, "Invalid or expired token");
        }

        if (!authData?.user) {
            throw new ApiError(401, "User not found");
        }

        // Attach user to request object
        req.user = authData.user;
        req.token = token;

        logger.debug("User authenticated", { userId: authData.user.id });

        next();
    } catch (err) {
        // If it's already an ApiError, pass it through
        if (err instanceof ApiError) {
            next(err);
        } else {
            logger.error("Authentication middleware error", err);
            next(new ApiError(500, "Authentication verification failed"));
        }
    }
}
