# SalonFlow - Phase 4 - Completed

## Implemented
- Added Conversation and ConversationParticipant entities.
- Extended Message with conversation ID, exact client message ID, sequence, edit, and soft-delete timestamps.
- Added authenticated `sendMessage` orchestration with server sequencing and notification triggering.
- Added authenticated `markConversationRead` using participant-owned read state.
- Updated the chat repository to expose normalized send and read commands.
- Retained legacy thread fields for deploy-safe compatibility.

## Changed
- Chat delivery and notification triggering can now occur through one trusted server command.
- Recipient read state no longer requires mutating the sender-owned Message record.
