/**
 * Quick Password Reset - Direct Database Update Simulation
 * This uses Supabase Admin API which directly updates the auth.users table
 * 
 * Usage:
 *   node quick-reset-password.js <email> <new-password>
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: "./.env" });

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const [email, password] = process.argv.slice(2);

if (!email || !password) {
    console.error("Usage: node quick-reset-password.js <email> <new-password>");
    process.exit(1);
}

(async () => {
    try {
        // Find user by email
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            console.error(`User ${email} not found`);
            process.exit(1);
        }

        console.log(`Updating password for: ${user.email} (${user.id})`);
        
        // This directly updates auth.users table via Admin API
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
        
        if (error) {
            console.error("Error:", error.message);
            process.exit(1);
        }

        console.log("✅ Password updated successfully!");
        console.log(`New password: ${password}`);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();



