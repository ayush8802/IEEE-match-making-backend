/**
 * Email Service
 * Supports SMTP (nodemailer), SendGrid, and Gmail API
 * Configure via environment variables: EMAIL_SERVICE=smtp|sendgrid|gmail_api
 */

import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { google } from "googleapis";
import config from "../config/index.js";
import logger from "../utils/logger.js";

// Initialize email service based on configuration
const emailService = process.env.EMAIL_SERVICE || "smtp";

if (emailService === "sendgrid" && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    logger.info("📧 SendGrid email service initialized");
} else if (emailService === "sendgrid") {
    logger.warn("📧 EMAIL_SERVICE=sendgrid but SENDGRID_API_KEY not set");
}

// Initialize Gmail API client if configured
let gmailClient = null;
if (emailService === "gmail_api") {
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "http://localhost:3000" // Redirect URI (not used for refresh token flow)
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        });

        gmailClient = google.gmail({ version: "v1", auth: oauth2Client });
        logger.info("📧 Gmail API email service initialized");
    } else {
        logger.warn("📧 EMAIL_SERVICE=gmail_api but Gmail API credentials not fully set", {
            hasClientId: !!process.env.GMAIL_CLIENT_ID,
            hasClientSecret: !!process.env.GMAIL_CLIENT_SECRET,
            hasRefreshToken: !!process.env.GMAIL_REFRESH_TOKEN,
        });
    }
}

/**
 * Create email transporter
 * Uses environment variables for SMTP configuration
 */
function createTransporter() {
    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // For production, require SMTP settings
    if (config.server.isProduction) {
        if (!smtpHost || !smtpUser || !smtpPass) {
            logger.error("❌ SMTP not fully configured in production", {
                hasHost: !!smtpHost,
                hasUser: !!smtpUser,
                hasPass: !!smtpPass,
                missing: [
                    !smtpHost && "SMTP_HOST",
                    !smtpUser && "SMTP_USER",
                    !smtpPass && "SMTP_PASS",
                ].filter(Boolean),
            });
            return null;
        }
    } else {
        // Development mode: if SMTP not configured, log only
        if (!smtpHost || !smtpUser || !smtpPass) {
            logger.warn("📧 SMTP not configured. Emails will be logged only in development mode.", {
                hasHost: !!smtpHost,
                hasUser: !!smtpUser,
                hasPass: !!smtpPass,
            });
            return null;
        }
    }

    logger.debug("📧 Creating SMTP transporter", {
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        user: smtpUser,
    });

    return nodemailer.createTransport({
        host: smtpHost || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
        // Connection timeout settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000, // 5 seconds
        socketTimeout: 10000, // 10 seconds
        // Retry settings
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
        // TLS options for better compatibility
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates if needed
            ciphers: 'SSLv3',
        },
    });
}

/**
 * Send contact form email
 * @param {Object} emailData - Email data
 * @param {string} emailData.from - Sender email
 * @param {string} emailData.fromName - Sender name
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.message - Email message body
 * @param {string} emailData.userEmail - User's email (for reply-to)
 * @param {string} emailData.userName - User's name
 * @returns {Promise<void>}
 */
export async function sendContactEmail({ from, fromName, to, subject, message, userEmail, userName }) {
    const transporter = createTransporter();

    // If no transporter (dev mode without SMTP), just log
    if (!transporter) {
        logger.info("📧 Email (not sent - dev mode):", {
            to,
            subject,
            from: `${fromName} <${from}>`,
            message,
        });
        return;
    }

    const mailOptions = {
        from: `${fromName} <${from}>`,
        to,
        replyTo: userEmail,
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b;">Contact Form Submission</h2>
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>From:</strong> ${userName} (${userEmail})</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                </div>
                <div style="background: #ffffff; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h3 style="color: #1e293b; margin-top: 0;">Message:</h3>
                    <p style="white-space: pre-wrap; color: #334155; line-height: 1.6;">${message}</p>
                </div>
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.875rem;">
                    <p>This email was sent from the IEEE Matchmaking Platform contact form.</p>
                    <p>To reply, simply reply to this email or send to: ${userEmail}</p>
                </div>
            </div>
        `,
        text: `
Contact Form Submission

From: ${userName} (${userEmail})
Subject: ${subject}

Message:
${message}

---
This email was sent from the IEEE Matchmaking Platform contact form.
To reply, send an email to: ${userEmail}
        `.trim(),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info("Contact email sent successfully", {
            messageId: info.messageId,
            to,
        });
        return info;
    } catch (error) {
        logger.error("Error sending contact email", error);
        throw error;
    }
}

/**
 * Send moderation alert email when a message is blocked
 * @param {Object} alertData - Alert data
 * @param {string} alertData.senderName - Sender's name
 * @param {string} alertData.senderEmail - Sender's email
 * @param {string} alertData.receiverName - Receiver's name
 * @param {string} alertData.receiverEmail - Receiver's email
 * @param {string} alertData.messageContent - Blocked message content
 * @param {string} alertData.blockedReason - Reason for blocking
 * @param {string} alertData.timestamp - Timestamp of blocked message
 * @returns {Promise<void>}
 */
export async function sendModerationAlert({
    senderName,
    senderEmail,
    receiverName,
    receiverEmail,
    messageContent,
    blockedReason,
    timestamp,
}) {
    const moderationEmail = process.env.MODERATION_EMAIL || "ieeemetaverse@gmail.com";

    // Shared HTML content for all email services
    const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
                <div style="background: #dc2626; color: #ffffff; padding: 1.5rem; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0; font-size: 1.5rem;">⚠️ Message Blocked - Community Guidelines Violation</h2>
                </div>
                
                <div style="padding: 2rem; background: #f8fafc;">
                    <div style="background: #ffffff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #dc2626;">
                        <h3 style="color: #1e293b; margin-top: 0;">Blocked Message Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0.5rem; color: #64748b; font-weight: bold; width: 150px;">Sender:</td>
                                <td style="padding: 0.5rem; color: #1e293b;">${senderName} (${senderEmail})</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.5rem; color: #64748b; font-weight: bold;">Receiver:</td>
                                <td style="padding: 0.5rem; color: #1e293b;">${receiverName} (${receiverEmail})</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.5rem; color: #64748b; font-weight: bold;">Timestamp:</td>
                                <td style="padding: 0.5rem; color: #1e293b;">${new Date(timestamp).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.5rem; color: #64748b; font-weight: bold;">Reason:</td>
                                <td style="padding: 0.5rem; color: #dc2626; font-weight: bold;">${blockedReason || "Content violation"}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: #ffffff; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h3 style="color: #1e293b; margin-top: 0;">Blocked Message Content</h3>
                        <div style="background: #f1f5f9; padding: 1rem; border-radius: 4px; border-left: 3px solid #dc2626;">
                            <p style="margin: 0; white-space: pre-wrap; color: #334155; font-family: monospace; font-size: 0.9rem;">${messageContent}</p>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1.5rem; padding: 1rem; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                        <p style="margin: 0; color: #991b1b; font-size: 0.875rem;">
                            <strong>Note:</strong> This message was automatically blocked and was not delivered to the recipient. 
                            Please review this incident and take appropriate action if necessary.
                        </p>
                    </div>
                </div>
                
                <div style="padding: 1rem; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; color: #64748b; font-size: 0.875rem; text-align: center;">
                    <p style="margin: 0;">This is an automated alert from the IEEE Matchmaking Platform moderation system.</p>
                </div>
            </div>
        `;

    const textContent = `
⚠️ MESSAGE BLOCKED - Community Guidelines Violation

BLOCKED MESSAGE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sender: ${senderName} (${senderEmail})
Receiver: ${receiverName} (${receiverEmail})
Timestamp: ${new Date(timestamp).toLocaleString()}
Reason: ${blockedReason || "Content violation"}

BLOCKED MESSAGE CONTENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${messageContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: This message was automatically blocked and was not delivered to the recipient.
Please review this incident and take appropriate action if necessary.

This is an automated alert from the IEEE Matchmaking Platform moderation system.
    `.trim();

    // Use Gmail API if configured (preferred - works on Railway)
    if (emailService === "gmail_api" && gmailClient) {
        try {
            logger.info("📧 Sending moderation alert via Gmail API...", {
                to: moderationEmail,
                senderEmail,
                receiverEmail,
            });

            const fromEmail = process.env.GMAIL_USER_EMAIL || "ieeemetaverse@gmail.com";
            
            // Create email message in RFC 2822 format
            const message = [
                `From: IEEE Matchmaking Platform <${fromEmail}>`,
                `To: ${moderationEmail}`,
                `Subject: 🚨 Blocked Message Alert - Community Guidelines Violation`,
                `MIME-Version: 1.0`,
                `Content-Type: multipart/alternative; boundary="boundary123"`,
                ``,
                `--boundary123`,
                `Content-Type: text/plain; charset=utf-8`,
                ``,
                textContent,
                ``,
                `--boundary123`,
                `Content-Type: text/html; charset=utf-8`,
                ``,
                htmlContent,
                ``,
                `--boundary123--`,
            ].join("\r\n");

            // Encode message in base64url format (Gmail API requirement)
            const encodedMessage = Buffer.from(message)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

            const response = await gmailClient.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedMessage,
                },
            });

            logger.info("✅ Moderation alert email sent successfully via Gmail API", {
                messageId: response.data.id,
                to: moderationEmail,
                from: fromEmail,
            });
            return response.data;
        } catch (error) {
            logger.error("❌ Error sending email via Gmail API", {
                error: error.message,
                code: error.code,
                response: error.response?.data,
                stack: error.stack,
            });
            throw error;
        }
    }

    // Use SendGrid if configured
    if (emailService === "sendgrid" && process.env.SENDGRID_API_KEY) {
        try {
            logger.info("📧 Sending moderation alert via SendGrid...", {
                to: moderationEmail,
                senderEmail,
                receiverEmail,
            });

            const msg = {
                to: moderationEmail,
                from: process.env.SENDGRID_FROM_EMAIL || "ieeemetaverse@gmail.com",
                subject: "🚨 Blocked Message Alert - Community Guidelines Violation",
                html: htmlContent,
                text: textContent,
            };

            await sgMail.send(msg);
            
            logger.info("✅ Moderation alert email sent successfully via SendGrid", {
                to: moderationEmail,
                from: msg.from,
            });
            return;
        } catch (error) {
            logger.error("❌ Error sending email via SendGrid", {
                error: error.message,
                code: error.code,
                response: error.response?.body,
                stack: error.stack,
            });
            throw error;
        }
    }

    // Fallback to SMTP
    const transporter = createTransporter();
    if (!transporter) {
        logger.warn("📧 Moderation Alert Email (not sent - no email service configured):", {
            to: moderationEmail,
            emailService,
            senderEmail,
            receiverEmail,
            blockedReason,
            messagePreview: messageContent.substring(0, 100),
        });
        return;
    }

    const mailOptions = {
        from: `IEEE Matchmaking Platform <${process.env.SMTP_USER}>`,
        to: moderationEmail,
        subject: `🚨 Blocked Message Alert - Community Guidelines Violation`,
        html: htmlContent,
        text: `
⚠️ MESSAGE BLOCKED - Community Guidelines Violation

BLOCKED MESSAGE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sender: ${senderName} (${senderEmail})
Receiver: ${receiverName} (${receiverEmail})
Timestamp: ${new Date(timestamp).toLocaleString()}
Reason: ${blockedReason || "Content violation"}

BLOCKED MESSAGE CONTENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${messageContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: This message was automatically blocked and was not delivered to the recipient.
Please review this incident and take appropriate action if necessary.

This is an automated alert from the IEEE Matchmaking Platform moderation system.
        `.trim(),
    };

    try {
        logger.info("📧 Sending moderation alert email via SMTP...", {
            to: moderationEmail,
            from: process.env.SMTP_USER,
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
        });
        
        // Add timeout wrapper to prevent hanging (15 second timeout)
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Email send timeout after 15 seconds"));
            }, 15000);
        });
        
        const info = await Promise.race([sendPromise, timeoutPromise]);
        
        logger.info("✅ Moderation alert email sent successfully via SMTP", {
            messageId: info.messageId,
            to: moderationEmail,
            from: process.env.SMTP_USER,
            accepted: info.accepted,
            rejected: info.rejected,
        });
        return info;
    } catch (error) {
        logger.error("❌ Error sending moderation alert email via SMTP", {
            error: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            to: moderationEmail,
            from: process.env.SMTP_USER,
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            stack: error.stack,
        });
        
        // Log helpful troubleshooting info for connection timeouts
        if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
            logger.error("💡 SMTP Connection Timeout - Railway blocks SMTP. Use SendGrid instead:", {
                solution: "Set EMAIL_SERVICE=sendgrid and SENDGRID_API_KEY in Railway",
                guide: "See EMAIL_SETUP_SENDGRID.md for instructions",
            });
        }
        
        throw error;
    }
}

