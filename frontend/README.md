# BookABand Admin

A React + Tailwind CSS admin console for the BookABand platform, built against the endpoints documented in `ADMIN_API_GUIDE.md` / `BOOK-A-BAND.postman_collection.json`. Color palette is inspired by the dark violet/magenta gradient look of the marketing site (deep near-black background, purple→pink accent gradients, glassmorphism cards).

## Stack

- React 19 + Vite
- Tailwind CSS v4 (CSS-first config in `src/index.css`)
- React Router v7
- Axios for API calls
- Recharts for the band analytics charts
- lucide-react for icons

## Getting started

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your API's base path
npm run dev
```

`VITE_API_BASE_URL` should point at wherever `/admin` and `/auth` are mounted on your backend (e.g. `http://localhost:5000/api`).

## Auth

Sign-in uses `POST /auth/login`. The admin API guide doesn't pin down the exact response field names for the JWT/user object, so `src/lib/auth.js` walks the response looking for a JWT-shaped string (checking common keys like `token`/`accessToken` first) and for a user object that has `role`. After login, the app checks that the resolved user's `role` includes `"admin"` and refuses access otherwise, matching the guide's `authorizeRoles("admin")` behavior. The token is stored in `localStorage` and attached as `Authorization: Bearer <token>` on every request; a `401` clears the session and redirects to `/login`.

## Pages

- **Dashboard** — platform-wide counts pulled from each list endpoint's `pagination.total`, plus quick links.
- **Users & Bands** — search/filter by role, verification, suspension state; per-user drawer with bookings/payments/disputes/availability tabs, email verification, role editing, suspend/restore.
- **Bookings** — filter by status/band/user/date range; detail drawer with payment/payout/dispute/activity log, cancel + force-complete actions.
- **Payouts** — filter by status/band/date range; detail drawer with retry action for `failed`/`waiting_onboarding` payouts.
- **Open Requests** — filter by status; force-expire action.
- **Posts & Comments** — moderate posts (filter by band/deleted state, soft-delete); a comment-by-ID utility for `DELETE /admin/comments/:commentId` since the API has no comment-listing endpoint.
- **Band Packages** — filter by band/active state; hard-delete with the backend's "no active bookings" guard.
- **Support Messages** — search/filter, detail drawer, status + admin note update.
- **Band Analytics** — look up any band by ID and view booking/request/post stats with charts.
- **Platform Config** — read-only view of `booking-policy` config and `field-options` enum reference.

## Notes on unknowns

A few things aren't specified in the API guide or Postman collection and are handled defensively rather than guessed exactly:

- **Status enum values** for payouts and support messages aren't listed, so those filters are free-text inputs with suggested values (datalist) rather than hard-coded `<select>` options — this avoids the UI silently blocking a valid backend status.
- **Record shapes** (e.g. exact `User`/`Booking` fields) are rendered defensively: known fields are shown with labels, and every detail drawer includes a collapsible "Raw record" JSON view as a fallback so nothing is hidden.
