/**
 * Reset User Password Script
 * This script allows you to reset a user's password using their user ID or email
 * 
 * Usage:
 *   node reset-user-password.js <user-id-or-email> <new-password>
 * 
 * Example:
 *   node reset-user-password.js user@example.com TempPassword123!
 *   node reset-user-password.js 123e4567-e89b-12d3-a456-426614174000 TempPassword123!
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

async function resetPassword(userIdentifier, newPassword) {
    try {
        console.log(`\n🔍 Looking up user: ${userIdentifier}...`);

        // Try to get user by ID or email
        let userId;
        let userEmail;

        // Check if it's a UUID (user ID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(userIdentifier)) {
            // It's a UUID, treat as user ID
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userIdentifier);
            
            if (userError || !userData?.user) {
                console.error(`❌ Error: User with ID "${userIdentifier}" not found`);
                console.error(userError?.message || "User not found");
                process.exit(1);
            }
            
            userId = userData.user.id;
            userEmail = userData.user.email;
            console.log(`✅ Found user: ${userEmail} (ID: ${userId})`);
        } else {
            // Treat as email
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (listError) {
                console.error("❌ Error listing users:", listError.message);
                process.exit(1);
            }

            const user = usersData.users.find(u => u.email?.toLowerCase() === userIdentifier.toLowerCase());
            
            if (!user) {
                console.error(`❌ Error: User with email "${userIdentifier}" not found`);
                process.exit(1);
            }

            userId = user.id;
            userEmail = user.email;
            console.log(`✅ Found user: ${userEmail} (ID: ${userId})`);
        }

        // Reset the password
        console.log(`\n🔄 Resetting password...`);
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) {
            console.error("❌ Error resetting password:", error.message);
            process.exit(1);
        }

        console.log(`\n✅ Password reset successfully!`);
        console.log(`\n📋 Details:`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${userEmail}`);
        console.log(`   New Password: ${newPassword}`);
        console.log(`\n⚠️  Important: Share this password securely with the user and ask them to change it after logging in.`);

    } catch (err) {
        console.error("❌ Unexpected error:", err.message);
        process.exit(1);
    }
}

// Get arguments from command line
const args = process.argv.slice(2);

if (args.length !== 2) {
    console.error("❌ Error: Invalid arguments");
    console.error("\nUsage:");
    console.error("  node reset-user-password.js <user-id-or-email> <new-password>");
    console.error("\nExamples:");
    console.error('  node reset-user-password.js user@example.com "TempPassword123!"');
    console.error('  node reset-user-password.js 123e4567-e89b-12d3-a456-426614174000 "TempPassword123!"');
    process.exit(1);
}

const [userIdentifier, newPassword] = args;

// Validate password length (Supabase minimum is 6 characters)
if (newPassword.length < 6) {
    console.error("❌ Error: Password must be at least 6 characters long");
    process.exit(1);
}

// Run the password reset
resetPassword(userIdentifier, newPassword);



