/**
 * Script to generate Gmail API refresh token
 * Run this once to get a refresh token for server-to-server email sending
 * 
 * Usage:
 * 1. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env
 * 2. Run: node generate_gmail_refresh_token.js
 * 3. Follow the prompts to authorize and get refresh token
 */

import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const TOKEN_PATH = "gmail_token.json";

const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "http://localhost:3000" // Redirect URI
);

/**
 * Get and store new token after prompting for user authorization
 */
function getNewToken() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });

    console.log("Authorize this app by visiting this url:", authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oauth2Client.getToken(code, (err, token) => {
            if (err) {
                console.error("Error retrieving access token", err);
                return;
            }

            console.log("\n✅ Success! Here are your tokens:\n");
            console.log("GMAIL_REFRESH_TOKEN=" + token.refresh_token);
            console.log("\nAdd this to your Railway environment variables.\n");

            // Optionally save to file
            if (token.refresh_token) {
                const fs = await import("fs");
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                console.log("Token stored to", TOKEN_PATH);
            }
        });
    });
}

// Check if we have stored credentials
if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.error("❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env");
    console.log("\nGet these from:");
    console.log("https://console.cloud.google.com/apis/credentials");
    process.exit(1);
}

console.log("🔐 Gmail API Token Generator");
console.log("============================\n");
getNewToken();

