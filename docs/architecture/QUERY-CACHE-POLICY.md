# Query Cache Policy

Backend-owned collections use TanStack Query. Realtime subscriptions update the matching query key through `applyRealtimeEvent`. UI-only state remains local. Mutations must optimistically update query data and invalidate only the affected domain key on settlement.
