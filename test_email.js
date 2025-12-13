/**
 * Test email sending to verify SMTP configuration
 * Run: node test_email.js
 */

import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function testEmail() {
    console.log("=== Testing Email Configuration ===\n");

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const moderationEmail = process.env.MODERATION_EMAIL || "ieeemetaverse@gmail.com";

    console.log("Configuration:");
    console.log("  SMTP_HOST:", smtpHost);
    console.log("  SMTP_PORT:", smtpPort);
    console.log("  SMTP_USER:", smtpUser);
    console.log("  SMTP_PASS:", smtpPass ? "***set***" : "NOT SET");
    console.log("  MODERATION_EMAIL:", moderationEmail);
    console.log("");

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.error("❌ SMTP configuration incomplete!");
        return;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: smtpPort === "465",
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
        debug: true, // Enable debug output
        logger: true, // Log to console
    });

    console.log("Attempting to send test email...\n");

    const mailOptions = {
        from: `IEEE Matchmaking Platform <${smtpUser}>`,
        to: moderationEmail,
        subject: "🧪 Test Email - Moderation System",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Test Email</h2>
                <p>This is a test email to verify SMTP configuration is working.</p>
                <p>If you receive this, email notifications are properly configured!</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `,
        text: `Test Email\n\nThis is a test email to verify SMTP configuration is working.\n\nTime: ${new Date().toLocaleString()}`,
    };

    try {
        // Verify connection first
        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("✅ SMTP connection verified!\n");

        // Send email
        console.log("Sending email...");
        const info = await transporter.sendMail(mailOptions);
        
        console.log("\n✅ Email sent successfully!");
        console.log("   Message ID:", info.messageId);
        console.log("   To:", moderationEmail);
        console.log("\nPlease check your inbox (and spam folder) for the test email.");
        
    } catch (error) {
        console.error("\n❌ Error sending email:");
        console.error("   Error code:", error.code);
        console.error("   Error message:", error.message);
        
        if (error.response) {
            console.error("   SMTP response:", error.response);
        }
        
        if (error.code === "EAUTH") {
            console.error("\n⚠️ Authentication failed!");
            console.error("   Common causes:");
            console.error("   1. Incorrect email address or password");
            console.error("   2. Using regular Gmail password instead of App Password");
            console.error("   3. 2-Factor Authentication not enabled");
            console.error("\n   Solution:");
            console.error("   1. Enable 2FA on Gmail account");
            console.error("   2. Generate App Password: https://myaccount.google.com/apppasswords");
            console.error("   3. Use the 16-character App Password (remove spaces)");
        } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
            console.error("\n⚠️ Connection failed!");
            console.error("   Common causes:");
            console.error("   1. Firewall blocking port", smtpPort);
            console.error("   2. Network connectivity issues");
            console.error("   3. Incorrect SMTP host");
        }
        
        process.exit(1);
    }
}

testEmail();


