# Local Server

`npm run local:server` starts the salon-PC backend on port 4317. It exposes health, message, read-state, notification, order, and Server-Sent Event endpoints. Persistence uses atomic JSON replacement as a dependency-free pilot store. The storage port is isolated so SQLite can replace it before broad production rollout.
