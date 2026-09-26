# Sirohi Point Single-Codebase Cross-Platform App Roadmap

This roadmap converts the product model in `Sirohi_Point_20_Slide_Presentation.pptx` into an implementation plan for one cross-platform client built with React Native and Expo. The same client targets web through React Native Web and native Android/iOS through Expo.

## 1. Product target

Sirohi Point is a multi-vendor marketplace for:

- Hardware products and installation
- Electronics, electrical products, electricians, and maintenance
- Paint products, painters, paint calculation, and color consultation
- Hyperlocal delivery through retailers and distributors
- B2B bulk procurement through request-for-quotation (RFQ)

The platform has five operating roles:

| Role | Primary job |
| --- | --- |
| Customer | Discover products, book services, pay, track, review |
| Vendor/Retailer | Manage catalog, inventory, orders, pricing, delivery |
| Contractor | Accept jobs, manage availability, execute work, collect earnings |
| Distributor | Manage territory, warehouses, retailers, and bulk supply |
| Admin | Approvals, commissions, disputes, settlements, analytics |

## 2. Recommended architecture

### Single client: React Native + Expo

- React Native with TypeScript as the only client UI codebase
- Expo Router for file-based navigation, deep links, web routes, and native navigation
- React Native Web for the browser build; use `npx expo export --platform web` for deployment
- Expo Application Services (EAS) for Android and iOS development, preview, and production builds
- TanStack Query for API state, caching, optimistic updates, and mutations
- React Hook Form + Zod for forms and validation
- NativeWind or Tamagui for shared responsive styling and design tokens
- React Native Testing Library for components, Playwright for the web target, and Maestro or Detox for native journeys

Use platform files only when the interaction truly differs:

```text
ProductCard.tsx          # shared default
ProductCard.web.tsx      # browser-specific hover/keyboard behavior
ProductCard.native.tsx   # native touch/gesture behavior
LocationPicker.ios.tsx   # iOS-specific permission or map behavior
LocationPicker.android.tsx
```

The goal is one product codebase, one navigation model, one state model, and one set of domain rules. Platform-specific files should be small adapters, not separate applications.

Expected build outputs:

```text
npx expo start --web          # Browser development
npx expo export --platform web
npx expo run:android          # Android development build
npx expo run:ios              # iOS development build on macOS
eas build --platform all     # Android/iOS release builds
```

### Shared client foundation

- `packages/contracts` for API DTOs, Zod schemas, pagination, errors, and event payloads
- `packages/domain` for pure pricing, paint calculation, order-state, and permission rules
- `packages/design-tokens` for color, typography, spacing, elevation, motion, and breakpoints
- Shared React Native components rendered on web through React Native Web

### Backend: NestJS

Use a modular monolith first. It keeps transactions and business rules consistent while leaving room to split high-load modules later.

Suggested modules:

```text
Identity & Access
Customers
Catalog
Search
Vendors
Inventory
Cart & Checkout
Orders
Payments
Delivery
Services & Contractors
RFQ / B2B Procurement
Reviews & Support
Notifications
Pricing, Commission & Settlements
Admin & Reporting
Files / Media
```

### Database: PostgreSQL

- PostgreSQL as the system of record
- Redis for cache, rate limits, idempotency keys, short-lived carts, and queues
- Object storage such as S3-compatible storage for product images, invoices, and room photos
- Search engine only when needed: PostgreSQL full-text search first; OpenSearch/Meilisearch after catalog scale justifies it
- One ORM only. Recommended: Prisma owned by NestJS. If the existing Drizzle setup is retained, use Drizzle consistently and do not introduce Prisma in parallel.

### Deployment shape

```text
React Native + Expo client
  ├── React Native Web browser build
  ├── Android build
  └── iOS build
              |
              v
        NestJS API  -----> PostgreSQL
              |                  |
              +--------------> Redis / queue
              +--------------> Object storage
              +--------------> Payments / maps / SMS / email
```

Keep the API as the owner of authorization, pricing, inventory, payment state, order state, and settlement calculations. The browser must never be trusted for these values.

## 3. MVP cut line

Build the smallest complete transaction loop first:

1. Customer registration and location selection
2. Product catalog for hardware, electronics, and paint
3. Search, category navigation, filters, product detail, and stock visibility
4. Cart, address, delivery estimate, checkout, COD, and one online payment provider
5. Order confirmation, status history, invoice, and cancellation rules
6. Basic service booking for electrician, painter, or hardware installation
7. Vendor onboarding, product upload, stock update, and order acceptance
8. Admin approval, commission configuration, order support, and basic reporting
9. One React Native customer experience rendered on web, Android, and iOS
10. Role-based vendor, contractor, distributor, and admin routes in the same client, with responsive web layouts and touch-first native layouts

Defer until the core loop is reliable:

- Virtual paint preview
- Live contractor location tracking
- Wallet and loyalty system
- Vendor subscriptions and featured ads
- Automated multi-vendor split settlement
- Advanced distributor territory management
- AI recommendations and fully automated dispatch

## 4. Delivery phases

### Phase 0 — Product and technical foundation (1–2 weeks)

Outputs:

- Confirm target launch city, service radius, delivery promise, and supported payment methods
- Convert the deck into user stories and acceptance criteria
- Define roles, permissions, order states, service states, and cancellation/refund policies
- Choose the ORM, hosting provider, payment provider, maps provider, and file-storage provider
- Create monorepo boundaries: `apps/client`, `apps/api`, `packages/design-tokens`, `packages/contracts`, `packages/domain`, `packages/config`, `infra`
- Set up environments: local, preview/staging, production
- Add CI checks for type-checking, linting, tests, migrations, and production builds

Exit criteria: a reviewed domain model, API conventions, design tokens, environments, and a prioritised backlog.

### Phase 1 — Cross-platform design system and app shells (3–4 weeks)

Build the product shell before feature screens:

- Design tokens for color, type, spacing, radius, shadows, motion, and states
- Accessible primitives: Button, Input, Select, Dialog, Drawer, Tabs, Table, Toast, Skeleton, EmptyState, ErrorState
- Expo Router navigation shared across web, Android, and iOS
- Responsive web layout primitives and touch-first native layout primitives in the same React Native component tree
- Shared tokens and interaction states, with small `.web`, `.native`, `.ios`, or `.android` adapters only when required
- Product cards, service cards, filters, price blocks, quantity controls, address selector, and order timeline
- Loading, offline, no-result, validation, permission, and error states
- Dark/light decision; do not let the current marketing visual treatment dictate operational dashboard usability
- Use the existing landing page as the brand direction, then migrate its brand language into a task-focused React Native Web/native commerce UI

Exit criteria: the same client starts in web, Android, and iOS modes; shared navigation works; keyboard and screen-reader behavior works on web; safe-area and gesture behavior works on native; layouts are tested at 360, 390, 768, 1024, 1280, and 1440 px widths.

### Phase 2 — Identity, catalog, and discovery (3–4 weeks)

Backend:

- OTP/email authentication with refresh-token rotation and device/session management
- Role-based access control plus resource-level checks for vendor, distributor, and admin data
- Product, category, brand, variant, attribute, media, price, tax, and availability models
- Vendor-owned catalog permissions and admin moderation workflow
- Search endpoint with pagination, sorting, filtering, and stable cursors

Shared React Native client:

- Home, category landing, search results, product detail, vendor profile, service directory, and account screens
- Expo Router URLs and deep links so the same route model works on web, Android, and iOS
- Responsive galleries and metadata for the web target; native optimized image loading for Android/iOS
- Platform-aware filters: URL/query filters on web and bottom sheets on native
- Deep links from notifications, shared product links, and order updates
- Offline-friendly recent views and retryable requests; checkout still requires a validated online state

Exit criteria: a customer can find an in-stock product and understand price, delivery area, seller, warranty, and service options.

### Phase 3 — Cart, checkout, orders, and payments (3–4 weeks)

- Server-backed cart with price revalidation at checkout
- Address book and delivery-zone validation
- Tax, delivery fee, discount, and commission calculation as versioned pricing rules
- Order aggregate with immutable line-item snapshots
- Payment intent/order creation, webhook verification, idempotency, retries, and reconciliation
- COD eligibility rules and fraud/risk flags
- Order status timeline and invoice generation
- Admin and vendor order operations

Recommended order state flow:

```text
Draft -> Pending payment -> Confirmed -> Accepted -> Packed -> Dispatched -> Delivered
                                                      \-> Cancelled / Returned / Refunded
```

Exit criteria: duplicate payment webhooks, refreshes, retries, and partial failures do not create duplicate orders or inconsistent totals.

### Phase 4 — Services and coordinated fulfillment (3 weeks)

- Contractor profiles, skills, service areas, documents, ratings, and verification status
- Availability windows, job request, accept/reject, reschedule, start, complete, and dispute states
- Product + service bundle attached to one customer project/order
- Manual dispatch first; rule-based nearest-provider matching second
- Delivery task model with pickup, handoff, proof-of-delivery, and failure reasons
- Notifications by email/SMS/push, with an in-app notification center

Exit criteria: a customer can buy a product, request the matching service, receive a confirmed appointment, and see the complete status timeline.

### Phase 5 — B2B RFQ and distributor operations (3–4 weeks)

- Business accounts, multiple contacts, tax/GST fields, and approval workflow
- RFQ creation with line items, quantity, delivery location, required date, and attachments
- Vendor quote submission, expiry, comparison, negotiation notes, and selection
- Bulk order conversion with negotiated prices and minimum-order rules
- Distributor territories, warehouses, retailer relationships, and stock visibility
- Buyer purchase history and downloadable documents

Exit criteria: a business buyer can submit an RFQ, receive multiple offers, compare them, select one, and convert it into an order.

### Phase 6 — Paint tools and conversion features (2–3 weeks)

- Paint calculator with explicit assumptions for coverage, coats, wastage, pack sizes, and surface type
- Product recommendations tied to calculated quantity and pack availability
- Room-photo upload with privacy notice, size limits, moderation, and deletion controls
- Virtual paint preview as an isolated experiment with a fallback to the standard product flow
- Measurement and funnel analytics for calculator use, preview use, add-to-cart, and purchase

Exit criteria: calculations are explainable, testable, and never silently promise an exact quantity when assumptions are incomplete.

### Phase 7 — Scale, finance, and cross-platform release hardening (ongoing)

- Automated vendor settlements and reconciliation
- Commission, subscription, promotions, delivery, refunds, and tax reports
- Search index and catalog ingestion pipeline
- Event-driven workers for notifications, invoices, image processing, and settlement batches
- Production Expo release hardening: React Native Web deployment, Android/iOS app-store builds, crash reporting, push notification reliability, deep links, background location policy, and upgrade strategy
- Split high-load services only when metrics show a clear need; likely candidates are search, dispatch, notifications, and settlements

## 5. Core data model

Start with these PostgreSQL aggregates and protect them with foreign keys, unique constraints, check constraints, and audit history:

```text
User, Role, Permission, Session
CustomerProfile, BusinessProfile, Address
Vendor, Contractor, Distributor, Retailer, VerificationDocument
Category, Brand, Product, ProductVariant, ProductMedia, ProductAttribute
Warehouse, InventoryItem, InventoryReservation, PriceList, TaxRule
Cart, CartItem, Order, OrderItem, OrderAddress, OrderStatusHistory
Payment, PaymentEvent, Refund, Invoice
Service, ContractorSkill, ServiceArea, AvailabilitySlot, Booking, JobStatusHistory
DeliveryTask, DeliveryZone, DeliveryProof
RFQ, RFQItem, Quote, QuoteItem
Review, Coupon, Promotion, Notification, SupportTicket
CommissionRule, Settlement, SettlementLine, AuditLog
```

Important rules:

- Store money as integer minor units plus currency; never use floating-point money
- Snapshot product name, SKU, tax, and price on `OrderItem`
- Reserve inventory transactionally and release expired reservations
- Use soft deletion for catalog and account records where auditability matters
- Add `createdAt`, `updatedAt`, and actor/audit fields to operational entities
- Use UTC in the database; convert only at the UI boundary
- Keep status transitions explicit and validated in the API

## 6. API and integration standards

- REST API with OpenAPI documentation initially; add GraphQL only if client composition becomes a measured problem
- Version public endpoints (`/api/v1`)
- Consistent response envelope, error codes, pagination, and correlation IDs
- Zod schemas shared between the single React Native client, React Native Web, and NestJS through `packages/contracts`
- Idempotency keys for checkout, payment creation, refund, quote acceptance, and settlement jobs
- Webhook signature verification for every external provider
- Background jobs for slow or retryable work; never block checkout on email, image processing, or analytics
- Rate limit OTP, login, search abuse, RFQ creation, and file uploads
- Audit log for admin actions, price changes, approvals, refunds, and settlements

## 7. Responsive UI and accessibility standards

Design for the smallest screen first, then enhance for larger viewports.

- Breakpoints should be driven by content, with 360 px as the minimum supported width
- No horizontal scrolling for primary flows
- Use React Native Flexbox and platform styles as the default; add `.web` layout adapters only where browser tables, wide dashboards, or SEO presentation require them
- Keep primary actions reachable with one thumb on mobile
- Use drawers/bottom sheets for filters and secondary actions on mobile
- Tables become cards or horizontally scrollable data regions with preserved headers
- Use one optimized image abstraction that maps to React Native Web and native image loading, with correct aspect ratios, lazy loading, and placeholders
- Respect safe-area insets, keyboard avoidance, permissions, gestures, and platform navigation behavior across web, Android, and iOS
- Provide visible focus, semantic landmarks, labels, keyboard support, and screen-reader announcements
- Maintain at least WCAG AA contrast and a minimum 44x44 px touch target
- Support `prefers-reduced-motion`; decorative 3D must never block content or interaction
- Test slow 4G, reduced CPU, low-memory mobile, zoom to 200%, keyboard-only use, and touch-only use

Performance budgets:

- React Native Web LCP under 2.5 seconds, INP under 200 ms, and CLS under 0.1 on the agreed mobile test profile
- React Native cold start and screen transition budgets agreed for low/mid-range Android devices
- Keep the first Expo route and first native screen bundles intentionally bounded
- Lazy-load 3D, maps, previews, charts, and admin-only modules on all targets

## 8. Security, reliability, and compliance baseline

- Use HttpOnly, Secure, SameSite cookies for the web target and OS secure storage/keychain-backed tokens for Android/iOS; rotate refresh tokens
- Passwordless OTP or strong password policy with brute-force protection
- RBAC plus ownership checks; never rely on hidden frontend routes
- Validate all input at the API boundary and sanitize rich text/media metadata
- Restrict file MIME types, size, dimensions, and upload count; scan files before publication
- Encrypt secrets and payment credentials through the cloud secret manager
- Backups with point-in-time recovery, restore drills, and tested retention
- Structured logs, metrics, traces, uptime checks, and alerting
- Document retention/deletion for customer data and uploaded room photos
- Maintain an incident runbook and a rollback plan for every production release

## 9. Testing strategy

Every milestone should ship with tests at the appropriate level:

- Unit: pricing, tax, commission, inventory reservation, paint calculation, state transitions
- Integration: NestJS modules against a disposable PostgreSQL database
- Contract: OpenAPI/shared schema compatibility between the Expo client and API
- End-to-end web: sign-in, search, checkout, payment webhook, booking, RFQ, vendor acceptance
- End-to-end native: sign-in, product discovery, checkout, push notification, booking, location, and delivery proof
- Visual regression: React Native Web viewports plus representative Android/iOS device sizes
- Accessibility: web axe checks plus keyboard, screen-reader, touch-target, and native accessibility smoke tests
- Load: catalog search, checkout, webhook bursts, RFQ submission, and admin reports
- Security: dependency scans, secret scans, API authorization tests, and upload abuse tests

Definition of done for a feature:

1. Acceptance criteria and error states are implemented.
2. Authorization is tested for every role that can access the resource.
3. Loading, empty, offline, validation, and failure states exist.
4. Analytics events and audit events are defined where relevant.
5. Unit/integration tests pass and the main user journey has an E2E test.
6. Responsive and accessibility checks pass at the supported breakpoints.
7. Logs, metrics, rollback behavior, and operational ownership are documented.

## 10. Suggested repository structure

```text
apps/
  client/              # One Expo/React Native codebase for web, Android, and iOS
  api/                 # NestJS API and workers
packages/
  design-tokens/       # Shared colors, type, spacing, motion, and breakpoints
  contracts/           # DTOs, schemas, API types, event contracts
  domain/              # Shared pure business rules
  config/              # TypeScript, ESLint, formatting, environment helpers
infra/
  docker/
  migrations/
  terraform-or-pulumi/
tests/
  e2e/
  visual/
```

The current website should remain the brand and product-story reference. Migrate the product experience into `apps/client` and render it with React Native Web in the browser and native React Native on Android/iOS. Keep heavy 3D marketing effects isolated from checkout and operational screens on every target.

## 11. Delivery sequence and team shape

An efficient initial team is:

- 1 product owner/domain lead
- 1 UX/UI designer
- 2 full-stack engineers
- 1 QA/automation engineer shared across the team
- Part-time DevOps/security support

With that team, a realistic first production pilot is approximately 16–22 weeks, depending on integrations and vendor onboarding. Release to one city or delivery zone first, measure operations, then expand geography and role complexity.

Release gates:

| Gate | Required proof |
| --- | --- |
| Internal alpha | Seeded catalog, test vendors, fake payment, complete happy paths |
| Closed pilot | Real vendors, real delivery zone, monitored payments, support process |
| Public MVP | Refunds, audit logs, backups, alerting, accessibility, load baseline |
| Expansion | Stable fulfillment metrics, vendor SLAs, settlement reconciliation, support capacity |

## 12. Product metrics

Track the operating system, not just page views:

- Search-to-product-view and product-view-to-cart conversion
- Checkout completion and payment failure rate
- Stock-out rate and cancellation rate
- On-time delivery and service appointment completion
- RFQ response rate, quote win rate, and time to first quote
- Vendor activation, catalog completeness, order acceptance time
- Contractor acceptance time, completion rate, and repeat booking
- Refund rate, support resolution time, and dispute rate
- Contribution margin by category, order, city, vendor, and service type
- Core Web Vitals and JavaScript errors by device class

## 13. First 10 implementation tickets

1. Confirm launch geography, business rules, and MVP acceptance criteria.
2. Create the single Expo/React Native client, NestJS API, and shared-package boundaries with environment configuration.
3. Add NestJS health, configuration, logging, validation, and OpenAPI foundations.
4. Choose and configure the single PostgreSQL ORM plus migration workflow.
5. Implement users, roles, sessions, and authorization guards.
6. Implement category/product/vendor schema with seed data for the three launch categories.
7. Build shared React Native catalog/search/product-detail screens and validate them on web, Android, and iOS against mocked API contracts.
8. Implement cart, server-side pricing, address validation, and order creation.
9. Integrate one payment provider with verified webhooks and idempotency.
10. Add vendor order acceptance, admin moderation, E2E checkout coverage, and pilot monitoring.

## Recommended starting point

Build the single `apps/client` Expo/React Native foundation first, then deliver the same catalog → cart → checkout → order-tracking vertical slice through React Native Web, Android, and iOS. The NestJS API and PostgreSQL database remain the single source of truth; platform-specific UI adapters should stay small and share contracts, tokens, analytics, and business rules.

Treat the current site as the brand and product-story layer, not as the finished marketplace UI. The next engineering increment should be the foundation plus a vertical slice: catalog → cart → checkout → order tracking, with a minimal vendor/admin workflow behind it. Once that slice works on mobile and survives real operational failure cases, add contractor booking, delivery coordination, B2B RFQ, and advanced paint tools one at a time.
