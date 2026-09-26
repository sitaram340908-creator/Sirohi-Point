# Sirohi Point

Sirohi Point is a multi-platform commerce and services marketplace for home-improvement products. The project includes a responsive customer storefront, B2B purchasing flow, administrator workspace, service-booking workflows, Razorpay payment integration, PostgreSQL persistence, and a versioned NestJS REST API.

The same Expo/React Native codebase supports web, Android, and iOS.

## Features

- Customer registration, login, profile, saved addresses, wishlist, cart, checkout, and order tracking
- B2C catalogue with categories, subcategories, search, stock visibility, reviews, and product details
- B2B catalogue with business registration, approval workflow, wholesale pricing, minimum quantities, and bulk cart
- Customer and B2B return requests using products from a delivered order
- Multiple products and quantities in one return request
- Seven-day return window from the order date
- Saved-address selection and address snapshot for return pickup
- Admin return-request queue with approval, pickup, received, and refunded statuses
- Admin product, HSN/tax, stock, user, business, order, banner, service, and contractor management
- Homepage banners with linked products, audience targeting, ordering, CTA, visibility, and image upload
- Touch swipe, mouse-wheel navigation, autoplay, and pagination for the homepage banner carousel
- Contractor discovery, service offers, booking, approval, acceptance, and completion flows
- Razorpay online payment initiation and verification, plus cash-on-delivery support
- Shared Zod contracts, TypeScript types, commerce calculations, and design tokens
- Helmet security headers, CORS, authentication guards, role guards, validation, health check, and Swagger

## Repository structure

```text
apps/
  api/                 NestJS API, Prisma schema, migrations, and seed
  client/              Expo Router app for web, Android, and iOS
packages/
  contracts/           Shared Zod schemas and TypeScript contracts
  domain/              Shared commerce and pricing calculations
  design-tokens/       Shared responsive colors and UI tokens
scripts/               Build, typecheck, and test orchestration scripts
docs/                  Workflow and HSN review notes
compose.yaml           Local PostgreSQL Docker service
```

## Requirements

- Node.js 22.13 or newer
- npm 10 or newer
- Docker Desktop for local PostgreSQL
- Android Studio or a connected Android device for Android development
- macOS with Xcode, or EAS Build, for iOS builds

Check your versions:

```powershell
node --version
npm --version
docker --version
```

## Initial setup

Install each app independently:

```powershell
Push-Location apps/api
npm install
Pop-Location
Push-Location apps/client
npm install
Pop-Location
docker compose up -d postgres
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/client/.env.example apps/client/.env
```

Open `apps/api/.env` and replace the placeholder secrets. At minimum, configure:

```dotenv
DATABASE_URL="postgresql://sirohi:sirohi@localhost:5432/sirohi_point?schema=public"
PORT=8075
CORS_ORIGINS="http://localhost:5084,http://localhost:3000"
AUTH_TOKEN_SECRET="use-at-least-32-random-characters"
ADMIN_EMAIL="your-admin-email@example.com"
ADMIN_PASSWORD="use-a-strong-admin-password"
```

For local web development, set the API URL in `apps/client/.env`:

```dotenv
EXPO_PUBLIC_API_URL="http://localhost:8075"
```

The client automatically calls `${EXPO_PUBLIC_API_URL}/api/v1`.

## Database setup

Generate the Prisma client and apply all committed migrations:

```powershell
Push-Location apps/api
npm run prisma:generate
npm run prisma:deploy
Pop-Location
```

Create the local admin account and demo catalogue:

```powershell
Push-Location apps/api
npm run prisma:seed
Pop-Location
```

The seed command uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `apps/api/.env`. These values become the administrator login credentials. No production admin credential is stored in the repository.

For local schema development, create a new migration with:

```powershell
Push-Location apps/api
npm run prisma:migrate
Pop-Location
```

The current return-request migrations are:

- `20260917120000_return_requests`
- `20260917153000_return_request_items`

Always apply these migrations before using the return pages. The second migration creates the multi-item return-request table.

## Start the application

Start the API in one terminal:

```powershell
Push-Location apps/api
npm run start:dev
Pop-Location
```

Start the Expo web client in another terminal:

```powershell
Push-Location apps/client
npm run web
Pop-Location
```

Local URLs:

- Storefront: `http://localhost:5084`
- Customer login: `http://localhost:5084/login`
- Customer signup: `http://localhost:5084/signup`
- Admin login: `http://localhost:5084/admin/login`
- API health: `http://localhost:8075/api/v1/health`
- Swagger API docs: `http://localhost:8075/api/docs`

The client is configured to use port `5084`; if that port is already in use, stop the process using it before starting the client.

## Platform commands

Run these inside `apps/client`:

```powershell
# Web
npm run web

# Android
npm run android

# iOS
npm run ios

# Production web export
npm run build
```

For native development, Expo may ask you to start an emulator or connect a device. iOS native builds require macOS/Xcode, while EAS can build iOS binaries remotely.

## Useful app scripts

```powershell
npm --prefix apps/api run build
npm --prefix apps/api run typecheck
npm --prefix apps/api run lint
npm --prefix apps/api test
npm --prefix apps/client run build
npm --prefix apps/client run typecheck
npm --prefix apps/client run lint
```

Each app has its own `package.json`, `package-lock.json`, and `node_modules`; the root package is not required to install or run either app.

## Environment variables

### API: `apps/api/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Local database | PostgreSQL connection string |
| `PORT` | No | API port; defaults to `8075` |
| `CORS_ORIGINS` | No | Comma-separated allowed client origins |
| `CLIENT_APP_URL` | No | Public client URL used for redirects; defaults to the deployed client URL |
| `AUTH_TOKEN_SECRET` | Yes for auth | Secret used to sign authentication tokens |
| `ADMIN_EMAIL` | Seed | Admin email used by the seed script |
| `ADMIN_PASSWORD` | Seed | Admin password used by the seed script |
| `RAZORPAY_API_BASE_URL` | No | Razorpay API base URL |
| `RAZORPAY_KEY_ID` | Online payments | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Online payments | Razorpay secret |
| `PUBLIC_API_URL` | Image URLs | Public API origin used when building uploaded-image URLs |
| `SHOP_STATE` | No | Shop state used by order/service defaults |
| `NODE_ENV` | No | Runtime environment, for example `development` or `production` |

### Client: `apps/client/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Yes | API origin without `/api/v1`; for local use `http://localhost:8075` |

Do not commit `.env` files, API secrets, payment secrets, or production tokens. Only `.env.example` files should be committed.

## Return-request workflow

1. A customer or approved business user opens a delivered order.
2. The user selects one or more products from that order.
3. The user enters a return quantity for each selected product and chooses a saved address.
4. The API verifies that every selected item belongs to the order.
5. The API verifies that the order is delivered and still within seven days of its order date.
6. The API prevents returning more units than were ordered or already included in an active return request.
7. The request appears in the customer account and the admin **Return requests** section.
8. Admin can move the request through `PENDING`, `APPROVED`, `PICKUP_SCHEDULED`, `RECEIVED`, and `REFUNDED`, or reject it.

Customer and business return endpoints:

```text
GET   /api/v1/returns
POST  /api/v1/returns
GET   /api/v1/returns/:id
```

Admin return endpoints:

```text
GET   /api/v1/admin/returns
PATCH /api/v1/admin/returns/:id/status
```

Example create payload:

```json
{
  "orderId": "order-id",
  "items": [
    { "orderItemId": "order-item-1", "quantity": 1 },
    { "orderItemId": "order-item-2", "quantity": 2 }
  ],
  "addressId": "saved-address-id",
  "reason": "Item received damaged"
}
```

## API overview

The API uses the `/api/v1` prefix and bearer-token authentication for protected resources.

Main route groups:

```text
/api/v1/health
/api/v1/auth
/api/v1/catalog
/api/v1/addresses
/api/v1/orders
/api/v1/returns
/api/v1/reviews
/api/v1/services
/api/v1/admin
/api/v1/admin/returns
```

Use Swagger at `/api/docs` for the generated endpoint documentation. Customer, business, contractor, and administrator routes are protected by authentication and role guards where required.

## Admin access

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `apps/api/.env`.
2. Run the Prisma seed command.
3. Open `/admin/login`.
4. Sign in using the values configured in the environment file.

The admin workspace includes product and inventory management, HSN master data, banners, users, businesses, orders, returns, service offers, service bookings, and contractors.

## PostgreSQL and Docker troubleshooting

Check the database container:

```powershell
docker compose ps
docker compose logs postgres
```

### Port `5432` is already allocated

Another PostgreSQL process or container is using port `5432`. Find the owner:

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
```

Stop only the process/container that you intentionally want to stop, or change the host-side Compose port and update `DATABASE_URL` accordingly. The database URL must always point to the host port exposed by Docker.

### Prisma `P1000` authentication failure

This means the username/password in `DATABASE_URL` does not match the PostgreSQL instance currently listening on the configured host and port. Confirm that the active Docker service was created with:

```text
Database: sirohi_point
User: sirohi
Password: sirohi
Host port: 5432
```

If a PostgreSQL installation outside Docker owns port `5432`, either stop that service or use its actual credentials. Do not assume that the Docker credentials apply to a different PostgreSQL server.

### Tables are missing or return APIs return `500`

The API does not automatically run migrations on startup. Apply the migrations and restart the API:

```powershell
Push-Location apps/api
npm run prisma:deploy
npm run prisma:generate
Pop-Location
```

If the database was intentionally recreated, seed it again:

```powershell
Push-Location apps/api
npm run prisma:seed
Pop-Location
```

Avoid `docker compose down -v` unless you intentionally want to remove the local PostgreSQL volume and all data stored in it.

## Production configuration

For a production deployment:

1. Provision PostgreSQL and set `DATABASE_URL` on the API host.
2. Set a long random `AUTH_TOKEN_SECRET`.
3. Set production `ADMIN_EMAIL` and `ADMIN_PASSWORD` as deployment secrets.
4. Set `CORS_ORIGINS` to the exact client origin(s).
5. Set `CLIENT_APP_URL` and `PUBLIC_API_URL` to public HTTPS URLs.
6. Configure Razorpay production credentials if online payments are enabled.
7. Run `prisma migrate deploy` during the API deployment.
8. Run the seed only when the deployment needs the initial catalogue/admin data.
9. Point the client `EXPO_PUBLIC_API_URL` to the deployed API origin, not to a local URL.

The API build command is:

```powershell
Push-Location apps/api
npm run build
Pop-Location
```

The web export command is:

```powershell
Push-Location apps/client
npm run build
Pop-Location
```

The API and client build independently. The client export is written to `apps/client/dist`; the API output is written to `apps/api/dist`. Hosting and process startup commands depend on the selected platform; keep API and client deployment environments separate so each receives the correct environment variables.

## Mobile distribution with EAS

Run EAS commands from `apps/client`:

```powershell
cd apps/client
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

The checked-in EAS profiles currently use the deployed Render API URL. Update the profile environment values before creating a build for another environment. Store signing, Google Play, Apple Developer, and App Store credentials in the appropriate Expo/EAS accounts; never commit them to this repository.

## Product and banner images

Admins can upload product and banner images from the web admin workspace. The API currently stores uploaded image data in PostgreSQL for a self-contained deployment. For higher traffic, replace the storage adapter with object storage while preserving the public `imageUrl` contract.

Bundled fallback product images are stored in:

```text
apps/client/assets/images/products/
```

The product-to-image mapping is maintained in:

```text
apps/client/src/data/product-media.ts
```

## Development notes

- Keep shared request/response changes in `packages/contracts` so the API and client remain type-safe.
- Generate Prisma client code after schema changes.
- Add a committed Prisma migration for every database schema change.
- Do not edit generated files inside `node_modules` or Prisma runtime directories.
- Keep secrets in environment variables and use `.env.example` for documented placeholders.
- Preserve existing order and inventory data when changing seed logic; the seed is designed to upsert demo catalogue data.
- Use the API health endpoint and Swagger page for basic deployment diagnostics.

## License

This project is private and currently marked `UNLICENSED` in the API workspace package configuration.
