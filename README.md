# Behavioral Commerce Demo

This is a Next.js storefront built to demonstrate behavioral tracking, event ingestion, and a file-based data analytics pipeline.

It is intentionally small in scope, but the core flow is real: browse products, view product pages, add items to cart, complete checkout, persist orders in MongoDB, stream application activity into a shared log file, and move those logs through NiFi, MinIO, and ClickHouse for analytics.

## What This App Does

- Renders a product catalog at `/` with search, category filters, price filters, and sorting.
- Serves product detail pages at `/product/[id]` with product view tracking and view-duration tracking.
- Keeps cart state on the client and emits add/remove cart events.
- Provides a multi-step checkout experience at `/checkout` that creates order records in MongoDB.
- Captures browser behavior through a tracking provider that records session, page, scroll, and click events.
- Ingests events through `POST /api/track` and stores them in MongoDB.
- Exposes an admin dashboard at `/admin` for event volume, engagement, and order analytics.
- Seeds a demo product catalog automatically on first access.

## Architecture

The project uses a custom Node server (`server.js`) to boot Next.js and emit structured JSON logs. The storefront and checkout features still rely on MongoDB, while a separate analytics pipeline copies those logs into file storage and then into analytical systems.

Core data paths:

- `lib/products.ts` seeds and fetches demo products from MongoDB.
- `components/tracking/tracking-provider.tsx` emits session, page, scroll, and click events from the browser.
- `lib/tracking/client.ts` batches browser events and flushes them automatically.
- `app/api/track/route.ts` validates and persists tracking payloads to MongoDB.
- `app/api/checkout/route.ts` creates orders from checkout submissions.
- `server.js` writes application and HTTP activity logs to `/app/logs/app.log`.
- NiFi reads `/opt/nifi/app-logs/app.log`, lands raw events in MinIO, and then loads curated records into ClickHouse.
- `lib/tracking/dashboard.ts` aggregates MongoDB data for the `/admin` dashboard.

Pipeline summary:

`Web App -> shared log file -> Apache NiFi -> MinIO -> Apache NiFi -> ClickHouse -> BI tools`

MongoDB remains part of the app runtime for products, orders, and the existing admin dashboard. The analytics pipeline is additive; it does not replace the app database.

## Main Screens

- `/` Product catalog with search, filtering, and product cards.
- `/product/[id]` Product detail page with image, description, price, and add-to-cart action.
- `/checkout` Multi-step checkout form that submits an order.
- `/admin` Metrics dashboard for events, sessions, orders, revenue, and engagement.

## Tracking Events

Each stored event has this shape:

- `event_type`: string
- `user_id`: string
- `session_id`: string
- `timestamp`: server-added `Date`
- `metadata`: object

Common event types in this project include:

- `session_start`
- `session_end`
- `page_view`
- `product_view`
- `product_view_duration`
- `product_click`
- `add_to_cart`
- `remove_from_cart`
- `checkout_step_continue`
- `checkout_submit`
- `checkout_success`
- `scroll_depth`
- `click_position`

`POST /api/track` accepts either a single event or an array of events. Requests are validated server-side, and batches are limited to 100 events per request.

Example payload:

```json
{
  "event_type": "add_to_cart",
  "user_id": "uuid-value",
  "session_id": "uuid-value",
  "metadata": {
    "product_id": "...",
    "product_name": "...",
    "price": 129
  }
}
```

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

Available scripts:

- `npm run dev`: start the custom Next.js development server.
- `npm run build`: build the production app.
- `npm run start`: run the production server.
- `npm run lint`: run ESLint.

## Environment Variables

Create a `.env` or `.env.local` file with at least:

```env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/demo_ecommerce?authSource=admin
MONGODB_DB=demo_ecommerce
APP_LOG_FILE=/app/logs/app.log
```

The app defaults to `demo_ecommerce` for the database name if `MONGODB_DB` is omitted.

## Docker Compose Stack

`docker-compose.yml` starts the full demo stack:

- `web-app`: the Next.js storefront, API routes, and file logger.
- `mongodb`: application database for products, events, and orders.
- `nifi`: ingestion and transformation layer for the analytics pipeline.
- `minio`: raw data lake / object storage for log archives.
- `clickhouse`: analytical database for curated reporting tables.

The web app writes logs to the shared `logs/` directory. That same volume is mounted into NiFi at `/opt/nifi/app-logs`, so the pipeline can ingest the exact file produced by the app.

## Repository Layout

- `app/`: Next.js app routes, pages, and APIs.
- `components/`: storefront UI, cart, tracking, and layout components.
- `lib/`: database, product, logging, and tracking helpers.
- `models/`: MongoDB/Mongoose schemas.
- `public/products/`: product artwork assets.
- `types/`: shared TypeScript types.

## Notes

- This is a demo commerce app, not a production storefront.
- The main objective is to generate useful behavioral and commerce events, then move them through a realistic analytics pipeline.
- Product data is auto-seeded, so the catalog is ready after the first database connection.
