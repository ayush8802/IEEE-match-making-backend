/**
 * Supabase Client Configuration
 * Provides both regular and admin clients for different use cases
 */

import { createClient } from "@supabase/supabase-js";
import config from "./index.js";

/**
 * Regular Supabase client (with service role for backend operations)
 * Used for general database operations
 */
export const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
);

/**
 * Supabase Admin client
 * Used for admin operations like user management
 */
export const supabaseAdmin = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
);

export default supabase;
