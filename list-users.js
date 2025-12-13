/**
 * List Users Script
 * This script lists all users in your Supabase database
 * 
 * Usage:
 *   node list-users.js
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config({ path: "./.env" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: Missing required environment variables");
    console.error("Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env");
    process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function listUsers() {
    try {
        console.log("\n🔍 Fetching users...\n");

        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error("❌ Error listing users:", error.message);
            process.exit(1);
        }

        if (!data.users || data.users.length === 0) {
            console.log("No users found.");
            return;
        }

        console.log(`📋 Found ${data.users.length} user(s):\n`);
        console.log("─".repeat(80));
        
        data.users.forEach((user, index) => {
            console.log(`\n${index + 1}. User`);
            console.log(`   ID:       ${user.id}`);
            console.log(`   Email:    ${user.email || "(no email)"}`);
            console.log(`   Created:  ${new Date(user.created_at).toLocaleString()}`);
            console.log(`   Updated:  ${new Date(user.updated_at).toLocaleString()}`);
            console.log(`   Confirmed: ${user.email_confirmed_at ? "Yes" : "No"}`);
            
            if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
                console.log(`   Metadata: ${JSON.stringify(user.user_metadata, null, 2).replace(/\n/g, "\n            ")}`);
            }
        });

        console.log("\n" + "─".repeat(80));
        console.log("\n💡 Tip: Use the User ID or Email with reset-user-password.js to reset a password");
        console.log("   Example: node reset-user-password.js <user-id-or-email> <new-password>\n");

    } catch (err) {
        console.error("❌ Unexpected error:", err.message);
        process.exit(1);
    }
}

listUsers();



