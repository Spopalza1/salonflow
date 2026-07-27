# ADR-0001: Modular Monolith with Ports and Adapters

Status: Accepted

SalonFlow will migrate incrementally from direct Base44 access in React components to feature hooks, application services, repository ports, and transport adapters. Base44 remains the active adapter until the local server reaches production parity. The architecture avoids a rewrite and keeps every migration phase deployable.
