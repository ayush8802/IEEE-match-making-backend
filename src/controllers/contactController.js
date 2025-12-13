/**
 * Contact Controller
 * Handles contact form submissions and sends emails
 */

import logger from "../utils/logger.js";
import { ApiError } from "../middleware/errorHandler.js";
import { sendContactEmail } from "../services/emailService.js";

/**
 * Handle contact form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function submitContact(req, res, next) {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            throw new ApiError(400, "All fields are required");
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Invalid email format");
        }

        logger.info("Contact form submission", { email, subject });

        // Send email to support address
        try {
            await sendContactEmail({
                from: email,
                fromName: name,
                to: "ieeemetaverse@gmail.com",
                subject: `Contact Form: ${subject}`,
                message,
                userEmail: email,
                userName: name,
            });

            logger.info("Contact email sent successfully", { email });

            res.json({
                success: true,
                message: "Your message has been sent successfully. We'll respond at the email address you provided.",
            });
        } catch (emailError) {
            logger.error("Failed to send contact email", emailError);
            throw new ApiError(500, "Failed to send message. Please try again later.");
        }
    } catch (err) {
        next(err);
    }
}

export default {
    submitContact,
};



