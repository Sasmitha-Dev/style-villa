# Style Villa — Manual QA Checklist

## 1. Homepage & Responsiveness
- [x] **Desktop (1440px)**: Header is transparent initially, turns solid on scroll with blur backdrop.
- [x] **Tablet (820px)**: Grid shifts to 2-column layout; booking bar remains readable and responsive.
- [x] **Mobile (390px)**: Hamburger navigation drawer slides out on tap; sticky "Book Now" bar remains anchored at viewport bottom.
- [x] **Images**: Hero photo and all 6 room photos render crisply with fallback to local assets.
- [x] **Services Grid**: 10 services displayed with clean SVG icons and subtle hover lift.
- [x] **Location**: Interactive Google Maps embed displays query "Style Villa Bentota".
- [x] **Reviews**: Displays authentic empty state ("Be the first to share your experience!") when no reviews are published.
- [x] **Review Submission**: Guest review form successfully submits; new reviews are saved as unpublished (`is_published = 0`).

## 2. 3-Step Booking Flow (`book.html`)
- [x] **Query Prefill**: Passing `?checkIn=2026-11-10&checkOut=2026-11-14&adults=2` correctly fills input fields.
- [x] **Step 1 (Dates & Guests)**: Prevents past check-in dates; check-out must be after check-in; max 30 nights enforced.
- [x] **Step 2 (Room Selection)**: Queries `/api/availability` and displays only unoccupied rooms matching capacity.
- [x] **Step 3 (Guest Details)**: Enforces full name, email, phone, country, and required terms checkbox.
- [x] **Sticky Summary**: Accurately computes duration (nights) and total price using authoritative DB prices.
- [x] **Double-Booking Prevention**: Returns graceful 409 error with redirect back to room selection if room is taken concurrently.
- [x] **State Persistence**: Form progress is preserved in `sessionStorage` between steps.

## 3. Confirmation Page (`confirmation.html`)
- [x] **Booking Reference**: Displays authoritative `SV-XXXXXX` reference code.
- [x] **Add to Calendar**: Generates client-side `.ics` file with valid VCALENDAR markup.
- [x] **Print Receipt**: Triggers clean print view with header/footer hidden.

## 4. Admin Panel (`admin/login.html` & `admin/dashboard.html`)
- [x] **Brute-Force Rate Limiting**: Strict 5 attempts/minute limit enforced on `/api/auth/login`.
- [x] **Authentication**: Validates against bcrypt hash; issues 8-hour JWT token stored in `sessionStorage`.
- [x] **Overview Stats**: Displays today's arrivals/departures, 7-day occupancy %, monthly revenue, and pending count.
- [x] **Bookings Table**: Search by reference/name, filter by status, update status to confirmed/cancelled/completed.
- [x] **Availability Lock**: Confirming a reservation immediately blocks that room from public search for those dates.
- [x] **Rooms Editor**: Edit nightly room prices and toggle active/inactive status.
- [x] **Blocked Dates**: Add custom maintenance blackout intervals and delete existing blocks.
- [x] **Review Moderation**: Review pending submissions and toggle publish status.
- [x] **Settings**: Update contact email, phone, location address, and policies.
- [x] **Session Expiry**: Auto-redirects to `login.html` on 401 unauthorized.

## 5. Security & Code Integrity
- [x] Parameterized SQL statements only (better-sqlite3).
- [x] Zod validation on all public and private endpoints.
- [x] Helmet security headers active.
- [x] Strict client-price disregard (server computes all totals).
- [x] All source files maintained under ~250 lines.
