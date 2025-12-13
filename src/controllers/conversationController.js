/**
 * Conversation Controller
 * Handles business logic for conversation operations
 */

import { supabase, supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

/**
 * Get all conversations for the current user
 * Returns conversations with last message and unread counts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function getConversations(req, res, next) {
    try {
        const authUser = req.user;

        logger.debug("Fetching conversations", { userId: authUser.id });

        // Get all conversations where user is user1 or user2
        // First, try to get conversations
        let { data: conversations, error } = await supabase
            .from("conversations")
            .select("*")
            .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id},user2_email.eq."${authUser.email}"`)
            .order("last_message_at", { ascending: false });

        // If table doesn't exist or other database error, return empty array (graceful degradation)
        if (error) {
            // Check if it's a "table doesn't exist" error (various error formats)
            const errorMsg = error.message?.toLowerCase() || "";
            const isTableNotFound = 
                error.code === "42P01" || 
                errorMsg.includes("does not exist") ||
                errorMsg.includes("could not find the table") ||
                errorMsg.includes("relation") && errorMsg.includes("does not exist") ||
                errorMsg.includes("schema cache");
            
            if (isTableNotFound) {
                logger.warn("Conversations table doesn't exist yet. Run the database migration: backend/create_conversations_system.sql");
                return res.json({
                    success: true,
                    data: [],
                    message: "Conversations table not found. Please run the database migration.",
                });
            }
            // For other errors, log and throw
            logger.error("Error fetching conversations", { error: error.message, code: error.code, details: error });
            throw new ApiError(500, `Failed to fetch conversations: ${error.message}`);
        }

        // Fetch last messages separately if conversations exist
        const conversationsWithMessages = await Promise.all(
            (conversations || []).map(async (conv) => {
                let lastMessage = null;
                if (conv.last_message_id) {
                    try {
                        const { data: msg } = await supabase
                            .from("messages")
                            .select("id, content, created_at, status, sender_id, sender_email")
                            .eq("id", conv.last_message_id)
                            .single();
                        if (msg) {
                            lastMessage = msg;
                        }
                    } catch (err) {
                        logger.warn("Error fetching last message", err);
                    }
                }
                return { ...conv, last_message: lastMessage };
            })
        );

        // Format conversations with participant info
        const formattedConversations = await Promise.all(
            conversationsWithMessages.map(async (conv) => {
                // Determine the other user (not the current user)
                let otherUserId = null;
                let otherUserEmail = null;
                let otherUserName = null;
                let otherUserPhoto = null;

                if (conv.user1_id === authUser.id) {
                    otherUserId = conv.user2_id;
                    otherUserEmail = conv.user2_email;
                } else {
                    otherUserId = conv.user1_id;
                }

                // Get other user's info if they have an ID
                if (otherUserId) {
                    try {
                        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(otherUserId);
                        if (userError) {
                            logger.warn("Error fetching user by ID", { userId: otherUserId, error: userError.message });
                        } else if (userData?.user) {
                            otherUserEmail = userData.user.email;
                            otherUserName = userData.user.user_metadata?.full_name || userData.user.email;
                            otherUserPhoto = userData.user.user_metadata?.avatar_url || null;
                        }
                    } catch (err) {
                        logger.error("Error fetching user info", { userId: otherUserId, error: err.message });
                        // Continue with available data
                    }
                } else if (otherUserEmail) {
                    // If no user ID, try to find by email
                    try {
                        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                        if (listError) {
                            logger.warn("Error listing users", { error: listError.message });
                            // Use email as name if lookup fails
                            otherUserName = otherUserEmail;
                        } else {
                            const otherUser = users?.users?.find((u) => u.email === otherUserEmail);
                            if (otherUser) {
                                otherUserId = otherUser.id;
                                otherUserName = otherUser.user_metadata?.full_name || otherUser.email;
                                otherUserPhoto = otherUser.user_metadata?.avatar_url || null;
                            } else {
                                // User not registered yet, use email as name
                                otherUserName = otherUserEmail;
                            }
                        }
                    } catch (err) {
                        logger.error("Error looking up user by email", { email: otherUserEmail, error: err.message });
                        // Use email as fallback name
                        otherUserName = otherUserEmail || "Unknown User";
                    }
                } else {
                    // No user ID or email available
                    otherUserName = "Unknown User";
                }

                // Get unread count for current user
                const unreadCount =
                    conv.user1_id === authUser.id
                        ? conv.user1_unread_count || 0
                        : conv.user2_unread_count || 0;

                return {
                    id: conv.id,
                    conversationId: conv.id,
                    otherUser: {
                        id: otherUserId,
                        email: otherUserEmail,
                        name: otherUserName,
                        photo: otherUserPhoto,
                    },
                    lastMessage: conv.last_message
                        ? {
                              id: conv.last_message.id,
                              content: conv.last_message.content,
                              timestamp: conv.last_message.created_at,
                              status: conv.last_message.status || "sent",
                              isFromMe: conv.last_message.sender_id === authUser.id,
                          }
                        : null,
                    lastMessageAt: conv.last_message_at,
                    unreadCount,
                    createdAt: conv.created_at,
                    updatedAt: conv.updated_at,
                };
            })
        );

        res.json({
            success: true,
            data: formattedConversations,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get messages for a specific conversation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function getConversationMessages(req, res, next) {
    try {
        const authUser = req.user;
        const { conversationId } = req.params;

        logger.debug("Fetching conversation messages", { userId: authUser.id, conversationId });

        // Verify user has access to this conversation
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("id, user1_id, user2_id, user2_email")
            .eq("id", conversationId)
            .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id},user2_email.eq."${authUser.email}"`)
            .single();

        if (convError || !conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        // Get all messages in this conversation
        const { data: messages, error } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (error) {
            throw new ApiError(500, `Failed to fetch messages: ${error.message}`);
        }

        // Format messages for frontend
        const formattedMessages = (messages || []).map((msg) => ({
            id: msg.id,
            text: msg.content,
            content: msg.content,
            sender_id: msg.sender_id,
            sender_email: msg.sender_email,
            receiver_id: msg.receiver_id,
            receiver_email: msg.receiver_email,
            timestamp: msg.created_at,
            created_at: msg.created_at,
            status: msg.status || "sent",
            delivered_at: msg.delivered_at,
            read_at: msg.read_at,
            isFromMe: msg.sender_id === authUser.id,
        }));

        res.json({
            success: true,
            data: formattedMessages,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Mark messages in a conversation as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function markConversationAsRead(req, res, next) {
    try {
        const authUser = req.user;
        const { conversationId } = req.params;

        logger.debug("Marking conversation as read", { userId: authUser.id, conversationId });

        // Verify user has access to this conversation
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("id")
            .eq("id", conversationId)
            .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id},user2_email.eq."${authUser.email}"`)
            .single();

        if (convError || !conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        // Use database function to mark messages as read
        const { error: functionError } = await supabase.rpc("mark_messages_as_read", {
            p_conversation_id: conversationId,
            p_user_id: authUser.id,
        });

        if (functionError) {
            logger.error("Error calling mark_messages_as_read function", functionError);
            // Fallback: update messages manually
            const { error: updateError } = await supabase
                .from("messages")
                .update({
                    status: "read",
                    read_at: new Date().toISOString(),
                })
                .eq("conversation_id", conversationId)
                .eq("receiver_id", authUser.id)
                .neq("status", "read");

            if (updateError) {
                throw new ApiError(500, `Failed to mark messages as read: ${updateError.message}`);
            }

            // Update conversation unread count
            const { data: conv } = await supabase
                .from("conversations")
                .select("user1_id, user2_id")
                .eq("id", conversationId)
                .single();

            if (conv) {
                const updateField =
                    conv.user1_id === authUser.id ? "user1_unread_count" : "user2_unread_count";
                await supabase
                    .from("conversations")
                    .update({ [updateField]: 0 })
                    .eq("id", conversationId);
            }
        }

        res.json({
            success: true,
            message: "Messages marked as read",
        });
    } catch (err) {
        next(err);
    }
}

export default {
    getConversations,
    getConversationMessages,
    markConversationAsRead,
};

