/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Validates that required environment variables are present
 * @param {string[]} required - Array of required env var names
 * @throws {Error} If any required env var is missing
 */
function validateEnv(required) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }
}

// Validate required environment variables
const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

validateEnv(requiredEnvVars);

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development",
    isDevelopment: process.env.NODE_ENV !== "production",
    isProduction: process.env.NODE_ENV === "production",
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // CORS Configuration
  cors: {
    // Normalize origin by removing trailing slash
    origin: (() => {
      const url = process.env.FRONTEND_URL || "http://localhost:3000";
      return url.endsWith('/') ? url.slice(0, -1) : url;
    })(),
    credentials: true,
  },

  // Webhook Configuration
  webhook: {
    url: process.env.WEBHOOK_URL || null,
  },

  // Moderation Configuration
  moderation: {
    email: process.env.MODERATION_EMAIL || "ieeemetaverse@gmail.com",
    enableAI: process.env.ENABLE_AI_MODERATION === "true",
    openaiApiKey: process.env.OPENAI_API_KEY || null,
    openaiModel: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  },

  // Email/SMTP Configuration
  email: {
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(process.env.SMTP_PORT || "587"),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER || null,
    smtpPass: process.env.SMTP_PASS || null,
  },
};

export default config;
