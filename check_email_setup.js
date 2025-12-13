/**
 * Quick script to check email configuration
 * Run: node check_email_setup.js
 */

import dotenv from "dotenv";
dotenv.config();

console.log("=== Email Configuration Check ===\n");

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS ? "***configured***" : "NOT SET";
const moderationEmail = process.env.MODERATION_EMAIL;

console.log("SMTP Configuration:");
console.log("  SMTP_HOST:", smtpHost || "NOT SET");
console.log("  SMTP_PORT:", smtpPort || "NOT SET");
console.log("  SMTP_USER:", smtpUser || "NOT SET");
console.log("  SMTP_PASS:", smtpPass);
console.log("\nModeration Email:");
console.log("  MODERATION_EMAIL:", moderationEmail || "NOT SET");

if (!smtpHost || !smtpUser || !process.env.SMTP_PASS) {
    console.log("\n❌ SMTP is NOT fully configured!");
    console.log("\nTo enable email notifications:");
    console.log("1. Add SMTP settings to your .env file:");
    console.log("   SMTP_HOST=smtp.gmail.com");
    console.log("   SMTP_PORT=587");
    console.log("   SMTP_SECURE=false");
    console.log("   SMTP_USER=your-email@gmail.com");
    console.log("   SMTP_PASS=your-app-password");
    console.log("\n2. For Gmail, you need to:");
    console.log("   - Enable 2-factor authentication");
    console.log("   - Generate an App Password (not your regular password)");
    console.log("   - Use the App Password as SMTP_PASS");
} else {
    console.log("\n✅ SMTP appears to be configured!");
    console.log("   If emails still don't send, check:");
    console.log("   - Backend server logs for email errors");
    console.log("   - SMTP credentials are correct");
    console.log("   - Firewall/network allows SMTP connections");
}


