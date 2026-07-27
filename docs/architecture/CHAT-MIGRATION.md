# Chat Compatibility Migration

Messages now support `conversation_id`, `client_message_id`, and server sequence numbers while retaining `thread_partner_id`. `sendMessage` dual-writes the normalized and legacy fields. Existing messages continue to load. Read progress moves to `ConversationParticipant`, avoiding recipient writes to another user's message record.
