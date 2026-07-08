# Behavioral Commerce Demo

This is a Next.js storefront and analytics demo built to show a complete commerce-plus-data-pipeline workflow.

The application has two equally important parts:

- a working demo storefront with catalog browsing, product detail views, cart actions, checkout, and an admin dashboard backed by MongoDB
- a file-based analytics pipeline that writes structured logs to disk, ingests them with Apache NiFi, lands raw data in MinIO, and loads curated records into ClickHouse for BI

The goal is not to simulate a polished production store. The goal is to generate useful user-behavior and commerce data and move that data through a realistic pipeline.

## Overview

- Browse products at `/`
- View product detail pages at `/product/[id]`
- Add items to cart and proceed through checkout at `/checkout`
- Inspect app-level analytics at `/admin`
- Track browser behavior such as sessions, page views, scroll depth, click position, product views, and cart actions
- Persist orders and product/catalog data in MongoDB
- Stream server and app activity into `logs/app.log`
- Ingest raw logs through NiFi into MinIO and ClickHouse

## What Lives Where

- MongoDB stores products, events, and orders used by the app runtime and admin dashboard.
- The local log file is the raw source for the big-data pipeline.
- NiFi is the ETL layer that reads the log file, stages raw data, and transforms it for analytics.
- MinIO is the object-store landing zone for raw log archives.
- ClickHouse is the analytical store used for curated reporting tables and downstream BI tools such as Power BI.

MongoDB is still required. The analytics pipeline is additive and does not replace the existing app database.

## Product Experience

The storefront is seeded automatically with demo products and behaves like a small B2C catalog:

- search by product name, category, or description
- filter by category and price band
- sort by featured order, price, or name
- open a product detail page for a richer product view
- add or remove items from a client-side cart
- complete a multi-step checkout flow that creates an order record

## User-Facing Pages

- `/` Product catalog with search, filters, sorting, and product cards
- `/product/[id]` Product detail page with product image, description, price, and add-to-cart action
- `/checkout` Multi-step checkout flow that submits the cart to MongoDB-backed order creation
- `/admin` Dashboard with event counts, session counts, revenue, order activity, and engagement metrics

## Tracking And Events

The browser tracking layer creates anonymous identifiers and sends structured events to the API. Events are batched when possible and flushed automatically.

Each event stored in MongoDB follows this shape:

- `event_type`: string
- `user_id`: string
- `session_id`: string
- `timestamp`: server-added `Date`
- `metadata`: object

Common event types:

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

`POST /api/track` accepts either a single event or an array of events. Payloads are validated server-side, and batches are limited to 100 events per request.

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

## Analytics Pipeline

The pipeline is built around the shared log file written by the app and the services defined in `docker-compose.yml`.

### Pipeline Flow

`Web App -> shared log file -> Apache NiFi -> MinIO -> Apache NiFi -> ClickHouse -> Power BI`

### How It Works

1. The custom Node server writes structured JSON log lines to `/app/logs/app.log` inside the web-app container.
2. The `app-logs` Docker volume mounts that same file to the host at `./logs/app.log` and to NiFi at `/opt/nifi/app-logs/app.log`.
3. NiFi tails the file and can write raw event objects into MinIO as immutable archive data.
4. A second NiFi flow reads the raw objects from MinIO, parses and reshapes them, and inserts curated rows into ClickHouse.
5. Power BI connects to ClickHouse for reporting and dashboarding.

### Why The Pipeline Exists

- The app already emits MongoDB-backed events for its built-in dashboard, but file-based logs are a better fit for ETL, replay, and lake-style processing.
- NiFi can ingest the same source file repeatedly, which makes the pipeline easy to observe and rebuild.
- MinIO gives you a cheap raw-data landing zone.
- ClickHouse gives you a fast analytical target for aggregations, dashboards, and BI queries.

### Logged Data

The raw log stream is intended to contain:

- HTTP access logs from the custom server
- activity events from `/api/track`
- checkout pipeline events from `/api/checkout`
- error events and ingestion summaries

Typical fields in the raw stream include:

- `timestamp`
- `event`
- `route`
- `method`
- `responseTimeMs`
- `userAgent`
- `statusCode`
- `activityType`
- `userId`
- `sessionId`
- `metadata`

### Storage And Routing

- Host path: `/home/adam/Desktop/big-data-app/logs/app.log`
- Web app path: `/app/logs/app.log`
- NiFi path: `/opt/nifi/app-logs/app.log`

The `app-logs` volume is shared across the web app and NiFi. NiFi reads the exact same file the app writes.

### Recommended NiFi Flow Structure

Flow A: raw ingest to MinIO

- `TailFile`
- `SplitText` or `SplitRecord`
- `PutS3Object`

Flow B: curated load to ClickHouse

- `ListS3`
- `FetchS3Object`
- `QueryRecord` or `JoltTransformJSON`
- `PutDatabaseRecord` or `PutSQL`

Recommended S3-compatible settings for MinIO:

- endpoint override: `http://minio:9000`
- access key: `minioadmin`
- secret key: `minioadmin123`

Recommended ClickHouse settings:

- host: `clickhouse`
- HTTP port: `8123`
- database: `analytics`

### Operational Caveat

The app still depends on MongoDB for products, orders, and its current admin dashboard. The analytics stack is meant to complement that runtime, not replace it.

## Architecture And Code Paths

Important files and responsibilities:

- `server.js`: custom Node bootstrap and request logging
- `app/api/track/route.ts`: event validation and persistence
- `app/api/checkout/route.ts`: order creation from checkout submissions
- `components/tracking/tracking-provider.tsx`: session, page, scroll, and click tracking
- `lib/tracking/client.ts`: client-side batching and flush logic
- `lib/products.ts`: product seed and read helpers
- `lib/tracking/dashboard.ts`: MongoDB aggregations for the admin dashboard
- `lib/mongodb.ts`: shared MongoDB connection helper
- `models/Event.ts`, `models/Order.ts`, `models/Product.ts`: database schemas

## Services In Docker Compose

`docker-compose.yml` starts the full demo stack:

- `web-app`: Next.js storefront, APIs, and file logger
- `mongodb`: application database for products, events, and orders
- `nifi`: ingestion and transformation layer for the analytics pipeline
- `minio`: raw object storage for log archives
- `clickhouse`: analytics database for curated reporting tables

The `app-logs` volume is bound to the host `logs/` directory through `APP_LOGS_DIR`, so the web app and NiFi can share the same physical log file.

## Environment Variables

Create a `.env` or `.env.local` file with at least:

```env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/demo_ecommerce?authSource=admin
MONGODB_DB=demo_ecommerce
APP_LOG_FILE=/app/logs/app.log
```

Optional but useful:

```env
APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
```

If `MONGODB_DB` is omitted, the app defaults to `demo_ecommerce`.

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

Available scripts:

- `npm run dev`: start the custom Next.js development server
- `npm run build`: build the production app
- `npm run start`: run the production server
- `npm run lint`: run ESLint

## Docker And Runtime Commands

Build and start the stack:

```bash
cd /home/adam/Desktop/big-data-app
mkdir -p logs
chmod 755 logs
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose up -d --build
```

Start an existing stack:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose up -d
```

Restart the stack:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose restart
```

Stop without removing volumes:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose stop
```

Stop and remove containers:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose down
```

Stop and remove everything including persisted volumes:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose down -v
```

## Service Access

Web app:

- `http://localhost:3000`

NiFi:

- `https://localhost:8443`
- username: `admin`
- password: `ChangeMeNifi123!`

MinIO:

- API: `http://localhost:9000`
- Console: `http://localhost:9001`
- username: `minioadmin`
- password: `minioadmin123`

ClickHouse:

- HTTP: `http://localhost:8123`
- Native: `localhost:9002`
- username: `analytics_user`
- password: `Analytics123!`
- database: `analytics`

## Verifying The Shared Log File

Check the host log file:

```bash
cd /home/adam/Desktop/big-data-app
ls -lah logs
tail -f logs/app.log
```

Check the web-app container:

```bash
docker exec -it bigdata-web-app ls -lah /app/logs
docker exec -it bigdata-web-app tail -f /app/logs/app.log
```

Check the NiFi container:

```bash
docker exec -it bigdata-nifi ls -lah /opt/nifi/app-logs
docker exec -it bigdata-nifi tail -f /opt/nifi/app-logs/app.log
```

## Suggested Demo Sequence

1. Start the stack with `docker compose up -d --build`.
2. Open the storefront at `http://localhost:3000`.
3. Browse products, open a detail page, and add an item to cart.
4. Complete checkout so MongoDB receives a new order.
5. Show the raw log file growing in `logs/app.log`.
6. Show NiFi reading the same file from `/opt/nifi/app-logs/app.log`.
7. Explain that NiFi writes raw logs to MinIO and curated data to ClickHouse.
8. Open the admin dashboard at `/admin` to show MongoDB-backed analytics.
9. Connect Power BI to ClickHouse for downstream reporting.

## Repository Layout

- `app/`: Next.js app routes, pages, and APIs
- `components/`: storefront UI, cart, tracking, and layout components
- `lib/`: database, product, logging, and tracking helpers
- `models/`: MongoDB/Mongoose schemas
- `public/products/`: product artwork assets
- `types/`: shared TypeScript types

## Notes

- This is a demo commerce app, not a production storefront.
- The app database is MongoDB, and the analytics pipeline is a separate file-based data path layered on top.
- Product data is auto-seeded, so the catalog is ready after the first database connection.
- If the analytics pipeline is not needed, the storefront and admin dashboard still work with MongoDB alone.
