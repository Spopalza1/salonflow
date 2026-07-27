# Notification Delivery Ownership

Durable notification records are produced only by trusted backend functions. Frontend hooks may observe existing records and render transient toasts, but they must not create another user's durable inbox event. Read/open/dismiss transitions are validated by `updateNotificationState`.
