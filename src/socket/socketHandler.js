/**
 * Socket Handler
 * Manages real-time WebSocket connections for chat functionality
 * Handles message sending, typing indicators, and read receipts
 */

import { supabase, supabaseAdmin } from "../config/supabase.js";
import logger from "../utils/logger.js";
import { moderateMessage, logModerationDecision } from "../services/moderationService.js";
import { sendModerationAlert } from "../services/emailService.js";

/**
 * Map to store user socket connections
 * Maps userId -> socketId for efficient message delivery
 */
const userSockets = new Map();

/**
 * Setup Socket.io event handlers
 * @param {Object} io - Socket.io server instance
 */
export const setupSocket = (io) => {
    io.on("connection", (socket) => {
        logger.info(`User connected: ${socket.id}`);

        /**
         * Handle user joining their personal room
         * @param {string} userId - The user's ID
         */
        socket.on("join_user", (userId) => {
            if (userId) {
                userSockets.set(userId, socket.id);
                socket.join(userId); // Join room named with the unique user ID from auth.users
                
                // Verify room was joined
                const room = io.sockets.adapter.rooms.get(userId);
                const roomSize = room ? room.size : 0;
                
                logger.info(`✅ User ${userId} joined their room (socket: ${socket.id}, Room size: ${roomSize})`);
                logger.info(`📊 Total users connected: ${userSockets.size}`);

                // Notify other users that this user is online
                socket.broadcast.emit("user_online", userId);
            } else {
                logger.warn(`⚠️ join_user called without userId - socket: ${socket.id}`);
            }
        });

        /**
         * Handle sending a message
         * Saves message to database, creates/updates conversation, and delivers to recipient
         */
        socket.on("send_message", async (data) => {
            const { sender_id, receiver_email, content, sender_email, receiver_id } = data;

            // Validate required fields
            if (!sender_id || !receiver_email || !content) {
                logger.error("Missing required fields in send_message", data);
                socket.emit("message_error", { error: "Missing required fields" });
                return;
            }

            try {
                // Always get receiver_id from email using auth.users table lookup
                // This ensures we use the unique ID from the main auth table
                let finalReceiverId = receiver_id;
                if (!finalReceiverId && receiver_email) {
                    try {
                        // Use getUserByEmail if available, otherwise list and find
                        // First try direct lookup via user management API
                        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                        if (listError) {
                            logger.error("Error listing users", listError);
                        } else {
                            // Find user by email (case-insensitive)
                            const receiverUser = users?.users?.find(
                                (u) => u.email?.toLowerCase() === receiver_email?.toLowerCase()
                            );
                            if (receiverUser?.id) {
                                finalReceiverId = receiverUser.id;
                                logger.info(`✅ Found receiver ID for email ${receiver_email}: ${finalReceiverId}`);
                            } else {
                                logger.warn(`⚠️ Receiver not found in auth.users for email: ${receiver_email}`);
                                logger.warn(`Total users in system: ${users?.users?.length || 0}`);
                            }
                        }
                    } catch (err) {
                        logger.error("Error looking up receiver by email", err);
                    }
                } else if (finalReceiverId) {
                    logger.info(`Using provided receiver_id: ${finalReceiverId}`);
                } else {
                    logger.warn(`No receiver_id or receiver_email provided`);
                }

                // ============================================
                // MODERATION CHECK - Before saving message
                // ============================================
                const moderationResult = await moderateMessage(content);

                if (!moderationResult.allowed) {
                    // Message is blocked - DO NOT save or deliver
                    logger.warn("🚫 Message blocked by moderation", {
                        sender_id,
                        receiver_email,
                        reason: moderationResult.reason,
                        method: moderationResult.method,
                        messagePreview: content.substring(0, 50),
                    });

                    // Get user names for email notification
                    let senderName = sender_email;
                    let receiverName = receiver_email;
                    try {
                        const { data: senderUser } = await supabaseAdmin.auth.admin.getUserById(sender_id);
                        if (senderUser?.user?.user_metadata?.full_name) {
                            senderName = senderUser.user.user_metadata.full_name;
                        }
                        if (finalReceiverId) {
                            const { data: receiverUser } = await supabaseAdmin.auth.admin.getUserById(finalReceiverId);
                            if (receiverUser?.user?.user_metadata?.full_name) {
                                receiverName = receiverUser.user.user_metadata.full_name;
                            }
                        }
                    } catch (err) {
                        logger.error("Error fetching user names for moderation alert", err);
                    }

                    // Log moderation decision (without message_id since message wasn't saved)
                    await logModerationDecision({
                        messageId: null,
                        senderId: sender_id,
                        receiverId: finalReceiverId,
                        messageContent: content,
                        result: moderationResult,
                    });

                    // Send email notification to moderation team
                    try {
                        logger.info("📧 Attempting to send moderation alert email", {
                            to: process.env.MODERATION_EMAIL || "ieeemetaverse@gmail.com",
                            senderEmail: sender_email,
                            receiverEmail: receiver_email,
                        });
                        
                        await sendModerationAlert({
                            senderName,
                            senderEmail: sender_email,
                            receiverName,
                            receiverEmail: receiver_email,
                            messageContent: content,
                            blockedReason: moderationResult.reason,
                            timestamp: new Date().toISOString(),
                        });
                        
                        logger.info("✅ Moderation alert email sent successfully");

                        // Update log to mark email as sent
                        // We'll update the most recent log entry for this message
                        const { data: recentLog } = await supabaseAdmin
                            .from("moderation_logs")
                            .select("id")
                            .eq("sender_id", sender_id)
                            .eq("message_content", content)
                            .order("timestamp", { ascending: false })
                            .limit(1)
                            .single();

                        if (recentLog?.id) {
                            await supabaseAdmin
                                .from("moderation_logs")
                                .update({ email_sent: true })
                                .eq("id", recentLog.id);
                        }
                    } catch (emailError) {
                        logger.error("❌ Error sending moderation alert email", {
                            error: emailError.message,
                            code: emailError.code,
                            response: emailError.response,
                            stack: emailError.stack,
                        });
                        // Don't fail the whole operation if email fails
                    }

                    // Notify sender that message was blocked
                    logger.info("📢 Emitting message_blocked event to sender", {
                        socketId: socket.id,
                        userId: sender_id,
                    });
                    
                    socket.emit("message_blocked", {
                        reason: moderationResult.reason || "Message violates community guidelines",
                        content: content, // Include content so UI can show it in warning
                    });

                    logger.info("✅ message_blocked event emitted to socket", { socketId: socket.id });
                    return; // Stop here - don't save or deliver message
                }

                // Message passed moderation - continue with normal flow
                logger.debug("✅ Message passed moderation", {
                    method: moderationResult.method,
                    sender_id,
                });

                // Log allowed message for audit trail
                await logModerationDecision({
                    messageId: null, // Will be updated after message is saved
                    senderId: sender_id,
                    receiverId: finalReceiverId,
                    messageContent: content,
                    result: moderationResult,
                });

                // Save message to Supabase database
                // The database trigger will automatically create/update conversation
                const { data: savedMsg, error } = await supabase
                    .from("messages")
                    .insert({
                        sender_id,
                        sender_email,
                        receiver_email,
                        receiver_id: finalReceiverId,
                        content,
                        status: "sent",
                    })
                    .select()
                    .single();

                if (error) {
                    logger.error("Error saving message", error);
                    socket.emit("message_error", { error: "Failed to send" });
                    return;
                }

                // Update moderation log with message_id now that message is saved
                try {
                    const { data: recentLog } = await supabaseAdmin
                        .from("moderation_logs")
                        .select("id")
                        .eq("sender_id", sender_id)
                        .eq("message_content", content)
                        .is("message_id", null)
                        .order("timestamp", { ascending: false })
                        .limit(1)
                        .single();

                    if (recentLog?.id) {
                        await supabaseAdmin
                            .from("moderation_logs")
                            .update({ message_id: savedMsg.id })
                            .eq("id", recentLog.id);
                    }
                } catch (logError) {
                    logger.error("Error updating moderation log with message_id", logError);
                    // Don't fail the whole operation if log update fails
                }

                // Get conversation_id from saved message (set by trigger)
                const conversationId = savedMsg.conversation_id;

                // Find receiver's socket connection and check if they're online
                let receiverSocketId = null;
                let receiverIsOnline = false;
                if (finalReceiverId) {
                    receiverSocketId = userSockets.get(finalReceiverId);
                    receiverIsOnline = !!receiverSocketId;
                    logger.info(`Receiver status - ID: ${finalReceiverId}, Online: ${receiverIsOnline}, Socket: ${receiverSocketId || 'N/A'}`);
                }

                // Format message for frontend consumption
                const messageForReceiver = {
                    id: savedMsg.id,
                    text: savedMsg.content,
                    content: savedMsg.content,
                    sender_id: savedMsg.sender_id,
                    sender_email: savedMsg.sender_email,
                    receiver_email: savedMsg.receiver_email,
                    receiver_id: savedMsg.receiver_id || finalReceiverId, // Use the unique ID from auth.users
                    conversation_id: conversationId,
                    timestamp: savedMsg.created_at,
                    created_at: savedMsg.created_at,
                    status: savedMsg.status || "sent",
                };

                // PRIMARY DELIVERY: Send directly to receiver's room using their unique ID
                // This is the correct way - using the unique ID from auth.users table
                if (finalReceiverId) {
                    // Check how many sockets are in the receiver's room
                    const receiverRoom = io.sockets.adapter.rooms.get(finalReceiverId);
                    const socketsInRoom = receiverRoom ? receiverRoom.size : 0;
                    logger.info(`📤 Sending to room '${finalReceiverId}' - Sockets in room: ${socketsInRoom}`);
                    
                    if (socketsInRoom > 0) {
                        io.to(finalReceiverId).emit("receive_message", messageForReceiver);
                        logger.info(`✅ Message sent directly to receiver's room (ID: ${finalReceiverId}, Room size: ${socketsInRoom})`);
                    } else {
                        logger.warn(`⚠️ Receiver's room is empty! User ${finalReceiverId} is not connected or hasn't joined their room.`);
                        logger.warn(`⚠️ Message will be available when user fetches conversations, but real-time delivery failed.`);
                        // Still emit - Socket.io will queue it if room doesn't exist
                        io.to(finalReceiverId).emit("receive_message", messageForReceiver);
                    }
                } else {
                    // Fallback: if receiver ID not found, broadcast with email filter
                    logger.error(`❌ Receiver ID not found, using broadcast fallback for email: ${receiver_email}`);
                    socket.broadcast.emit("receive_message", {
                        ...messageForReceiver,
                        _receiver_email: receiver_email,
                        _broadcast: true,
                    });
                }
                
                // Also send message back to sender so they see it in their chat (only if sender is different from receiver)
                if (sender_id !== finalReceiverId) {
                    const messageForSender = {
                        ...messageForReceiver,
                        sender_id: savedMsg.sender_id,
                        receiver_id: savedMsg.receiver_id,
                    };
                    io.to(sender_id).emit("receive_message", messageForSender);
                    logger.info(`✅ Message also sent back to sender (ID: ${sender_id}) so they can see their own message`);
                }

                // Update message status to 'delivered' if receiver is online
                if (receiverIsOnline && finalReceiverId) {
                    const { error: updateError } = await supabase
                        .from("messages")
                        .update({ 
                            status: "delivered",
                            delivered_at: new Date().toISOString()
                        })
                        .eq("id", savedMsg.id);

                    if (!updateError) {
                        logger.info(`✅ Message ${savedMsg.id} marked as delivered (receiver online)`);
                        // Notify sender about delivery status
                        io.to(sender_id).emit("message_status_update", {
                            messageId: savedMsg.id,
                            status: "delivered",
                        });

                        // Notify receiver about their own message status (if they sent it to themselves)
                        if (finalReceiverId !== sender_id) {
                            io.to(finalReceiverId).emit("message_status_update", {
                                messageId: savedMsg.id,
                                status: "delivered",
                            });
                        }
                    }
                } else {
                    logger.info(`ℹ️ Receiver offline (ID: ${finalReceiverId || 'unknown'}), message ${savedMsg.id} will be delivered when they connect`);
                }

                // Emit conversation update to both users
                if (conversationId) {
                    const { data: conversation } = await supabase
                        .from("conversations")
                        .select("*")
                        .eq("id", conversationId)
                        .single();

                    if (conversation) {
                        // Notify sender about conversation update
                        io.to(sender_id).emit("conversation_updated", conversation);
                        
                        // PRIMARY: Notify receiver using their unique ID from auth.users
                        if (finalReceiverId) {
                            io.to(finalReceiverId).emit("conversation_updated", conversation);
                            logger.info(`✅ Conversation update sent to receiver (ID: ${finalReceiverId})`);
                        } else {
                            // Fallback: broadcast with email filter (should rarely be needed)
                            logger.warn(`⚠️ Receiver ID not available, using broadcast fallback for email: ${receiver_email}`);
                            socket.broadcast.emit("conversation_updated", {
                                ...conversation,
                                _receiver_email: receiver_email,
                                _broadcast: true,
                            });
                        }
                    }
                }

                // Confirm message sent to sender
                socket.emit("message_sent", savedMsg);
            } catch (err) {
                logger.error("Socket message error", err);
                socket.emit("message_error", { error: "Internal server error" });
            }
        });

        /**
         * Handle typing indicator
         * Notifies receiver when sender is typing
         */
        socket.on("typing", (data) => {
            const { receiver_id, receiver_email, isTyping } = data;
            const senderUserId = socket.handshake.query.userId || data.sender_id;

            // Emit typing status to receiver (by ID or email)
            if (receiver_id) {
                io.to(receiver_id).emit("typing_status", {
                    userId: senderUserId,
                    isTyping,
                });
            } else if (receiver_email) {
                // If no receiver_id, broadcast to all (frontend will filter)
                socket.broadcast.emit("typing_status", {
                    userId: senderUserId,
                    receiver_email,
                    isTyping,
                });
            }
        });

        /**
         * Handle marking messages as read
         * Updates message status in database, resets unread counts, and notifies sender
         */
        socket.on("mark_read", async (data) => {
            const { conversation_id, user_id, messageIds } = data;

            if (!conversation_id || !user_id) {
                logger.error("Missing conversation_id or user_id in mark_read", data);
                return;
            }

            try {
                // Use database function to mark messages as read and update conversation
                const { error: functionError } = await supabase.rpc("mark_messages_as_read", {
                    p_conversation_id: conversation_id,
                    p_user_id: user_id,
                });

                if (functionError) {
                    logger.error("Error marking messages as read", functionError);
                    // Fallback: update messages manually
                    if (messageIds && messageIds.length > 0) {
                        await supabase
                            .from("messages")
                            .update({ 
                                status: "read",
                                read_at: new Date().toISOString()
                            })
                            .in("id", messageIds);
                    }
                }

                // Get updated conversation
                const { data: conversation } = await supabase
                    .from("conversations")
                    .select("*")
                    .eq("id", conversation_id)
                    .single();

                // Get all message senders in this conversation to notify
                const { data: messages } = await supabase
                    .from("messages")
                    .select("sender_id")
                    .eq("conversation_id", conversation_id)
                    .eq("receiver_id", user_id)
                    .neq("status", "read")
                    .limit(1);

                // Notify senders that their messages were read
                if (messages && messages.length > 0) {
                    const senderId = messages[0].sender_id;
                    if (senderId && senderId !== user_id) {
                        io.to(senderId).emit("messages_read", { 
                            conversationId: conversation_id,
                            messageIds: messageIds || []
                        });
                    }
                }

                // Notify user about conversation update
                if (conversation) {
                    io.to(user_id).emit("conversation_updated", conversation);
                }
            } catch (err) {
                logger.error("Error in mark_read handler", err);
            }
        });

        /**
         * Handle user disconnection
         * Clean up user socket mapping
         */
        socket.on("disconnect", () => {
            logger.info(`User disconnected: ${socket.id}`);

            // Remove user from socket mapping
            for (const [uid, sid] of userSockets.entries()) {
                if (sid === socket.id) {
                    userSockets.delete(uid);
                    break;
                }
            }
        });
    });
};
