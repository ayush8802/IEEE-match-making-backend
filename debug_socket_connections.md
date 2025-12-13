# Socket Connection Debugging Guide

## Problem: Messages not reaching User 2

### Step 1: Check Backend Logs

When User 1 sends a message, look for these log messages:

1. **Receiver ID Lookup:**
   ```
   ✅ Found receiver ID for email <email>: <user_id>
   ```
   OR
   ```
   ⚠️ Receiver not found in auth.users for email: <email>
   ```

2. **Socket Connection Status:**
   ```
   📊 Receiver status - ID: <user_id>, Online: true/false, Socket: <socket_id>
   📊 Total connected users: <number>
   📊 Connected user IDs: <list of IDs>
   ```

3. **Room Status:**
   ```
   📤 Sending to room '<user_id>' - Sockets in room: <number>
   ```

4. **Message Delivery:**
   ```
   ✅ Message sent directly to receiver's room (ID: <user_id>, Room size: <number>)
   ```
   OR
   ```
   ⚠️ Receiver's room is empty! User <user_id> is not connected or hasn't joined their room.
   ```

### Step 2: Check User 2's Browser Console

Open User 2's browser console (F12) and look for:

1. **Socket Connection:**
   ```
   ✅ [SOCKET] Connected! Joining room for user: <user_id> Email: <email>
   ```

2. **Message Reception:**
   ```
   🔵 [CHAT] Received message via socket: {...}
   🔵 [CHAT] Is message for me? true/false
   ```

### Step 3: Common Issues

#### Issue 1: User 2 not in room
**Symptom:** Backend log shows "Receiver's room is empty"
**Solution:** 
- User 2 needs to refresh their browser
- Check User 2's console for socket connection errors

#### Issue 2: Receiver ID not found
**Symptom:** Backend log shows "Receiver not found in auth.users"
**Solution:**
- Verify User 2's email matches exactly in Supabase auth.users table
- Check for case sensitivity issues

#### Issue 3: Message sent but User 2 doesn't see it
**Symptom:** Backend shows message sent, but User 2's console shows nothing
**Solution:**
- Check if User 2's socket is connected
- Check if User 2's frontend is filtering messages incorrectly
- User 2 should refresh conversations list (messages are saved to DB)

### Step 4: Force Conversation Refresh

Even if socket delivery fails, User 2 should see messages when they:
1. Refresh the page
2. Click on the conversation
3. The conversation list refreshes

This is because messages are saved to the database and fetched via the `/api/v1/conversations` endpoint.



