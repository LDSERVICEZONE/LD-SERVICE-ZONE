# Architecture

LD SERVICE ZONE is a modular monolith. The Vite/React frontend and Node API
remain in one repository and deploy as one application.

## Backend boundaries

- `server.js` loads configuration, initializes shared services, seeds required
  data, and dispatches requests.
- `server/routes/` owns HTTP behavior by domain. Route modules may coordinate
  services and repositories, but provider-specific transport belongs elsewhere.
- `server/services/` contains external provider clients and integration
  boundaries.
- `server/repositories/` owns persistence. Route modules do not access storage
  APIs directly.
- `server/middleware/` contains request policies such as authentication.
- `server/lib/` contains small shared utilities without domain state.
- `server/data/` contains static seed/catalogue data.

Add new endpoints to the matching domain route. Add a new route module when the
endpoint represents a new business domain rather than extending `server.js`.

## Frontend boundaries

- `src/features/` contains application-wide feature state and behavior.
- `src/shared/` contains infrastructure used by multiple features, including the
  authenticated API client.
- `src/pages/app/` contains retailer routes.
- `src/pages/admin/` contains administrator routes.
- `src/components/` contains reusable presentation and layout components.

Pages are loaded lazily from `src/App.tsx`, keeping route code out of the initial
browser bundle.
