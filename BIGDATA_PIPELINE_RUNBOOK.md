# Big Data Analytics Pipeline Runbook

## 1. Architecture Overview

This project now emits structured JSON logs from the web application into a local file at `./logs/app.log`. The deployment architecture is:

`Web App -> Apache NiFi -> MinIO -> Apache NiFi -> ClickHouse -> Power BI`

How the pieces connect:

1. The Next.js web app writes line-delimited JSON logs to `/app/logs/app.log` inside the container.
2. The Docker volume `app-logs` is shared between the web app and NiFi.
3. NiFi reads that same file from `/opt/nifi/app-logs/app.log`.
4. NiFi can land the raw events into MinIO as your S3-compatible data lake.
5. A second NiFi flow can read raw objects from MinIO, transform them, and load curated records into ClickHouse.
6. Power BI connects to ClickHouse for dashboards and analytics.

Important current-codebase caveat:

- The application still has MongoDB dependencies for products, orders, and the existing admin dashboard.
- The new file logger is added for your big-data pipeline, but this compose stack does not replace MongoDB-backed app features by itself.
- If you want the current storefront and admin pages to keep working exactly as they do now, `MONGODB_URI` still needs to be available in `.env`.

## 2. Logging Design

Why the logging system was updated:

- The previous activity tracking path only persisted events into MongoDB through `/api/track`.
- That is useful for the existing dashboard, but it is not enough for a file-based ETL pipeline because NiFi needs a durable log source it can tail or ingest.
- `server.js` also referenced `./lib/logger.js`, but that file was missing, so the request logging path was incomplete.

What is logged now:

- HTTP access logs from the custom Node server.
- Activity logs from `/api/track`.
- Checkout pipeline events from `/api/checkout`.
- Errors and ingestion summaries.

Log format:

- JSON lines
- One event per line
- Stored at `./logs/app.log` on the VM

Key fields now present in the raw log stream:

- `timestamp`
- `event`
- `route`
- `method`
- `responseTimeMs`
- `userAgent`
- `statusCode` for HTTP access logs
- `activityType`, `userId`, `sessionId`, and `metadata` for user activity logs

## 3. Container Topology

### Web App

- Built from the local `Dockerfile`
- Exposed on `http://localhost:3000`
- Writes logs to `/app/logs/app.log`
- Mounts the shared `app-logs` volume

### Apache NiFi

- Image: `apache/nifi:latest`
- Exposed on `https://localhost:8443`
- Single-user auth configured through environment variables
- Reads the app logs from:

`/opt/nifi/app-logs/app.log`

That is the exact absolute path inside the NiFi container that should be used in processors such as `TailFile`, `GetFile`, or any file-reader flow.

### MinIO

- Image: `minio/minio:latest`
- S3 API: `http://localhost:9000`
- Console: `http://localhost:9001`
- Credentials:
  - User: `minioadmin`
  - Password: `minioadmin123`

### ClickHouse

- Image: `clickhouse/clickhouse-server:latest`
- HTTP interface: `http://localhost:8123`
- Native interface: `localhost:9002`
- Browser / HTTP auth credentials:
  - Username: `analytics_user`
  - Password: `Analytics123!`
  - Database to use in examples: `analytics`

## 4. How Everything Is Linked

The shared logging path:

- On the VM host: `/home/adam/Desktop/big-data-app/logs/app.log`
- In the web app container: `/app/logs/app.log`
- In the NiFi container: `/opt/nifi/app-logs/app.log`

The Docker volume design:

- `app-logs` is a named Docker volume
- It is backed by the host directory `/home/adam/Desktop/big-data-app/logs`
- The web app writes to it
- NiFi mounts it read-only and consumes the exact same file

The service network:

- All services join the custom bridge network `bigdata-net`
- Container-to-container service names are:
  - `web-app`
  - `nifi`
  - `minio`
  - `clickhouse`

Examples for internal container connectivity:

- NiFi to MinIO endpoint: `http://minio:9000`
- NiFi to ClickHouse HTTP endpoint: `http://clickhouse:8123`
- NiFi to ClickHouse native endpoint: `clickhouse:9000`

## 5. Exact Commands To Build And Start The Cluster

Run these commands from your VM terminal:

```bash
cd /home/adam/Desktop/big-data-app
mkdir -p logs
chmod 755 logs
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose build
docker compose up -d
docker compose ps
```

If you want to rebuild and start in one step:

```bash
cd /home/adam/Desktop/big-data-app
mkdir -p logs
chmod 755 logs
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose up -d --build
```

## 6. Relaunch, Restart, And Shutdown

Start existing containers again:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose up -d
```

Restart the full stack:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose restart
```

Stop the containers without deleting volumes:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose stop
```

Stop and remove containers while keeping the named data volumes:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose down
```

Stop and remove everything including persisted MinIO and ClickHouse data:

```bash
cd /home/adam/Desktop/big-data-app
export APP_LOGS_DIR=/home/adam/Desktop/big-data-app/logs
docker compose down -v
```

## 7. How To Access Each Service

Web app:

- `http://localhost:3000`

NiFi:

- `https://localhost:8443`
- Username: `admin`
- Password: `ChangeMeNifi123!`

MinIO:

- API: `http://localhost:9000`
- Console: `http://localhost:9001`
- Username: `minioadmin`
- Password: `minioadmin123`

ClickHouse:

- HTTP: `http://localhost:8123`
- Native: `localhost:9002`
- Username: `analytics_user`
- Password: `Analytics123!`
- Database: `analytics`

## 8. How To Verify The Log File And Shared Mount

Check that the host log file exists:

```bash
cd /home/adam/Desktop/big-data-app
ls -lah logs
tail -f logs/app.log
```

Check that the web app container sees the file:

```bash
docker exec -it bigdata-web-app ls -lah /app/logs
docker exec -it bigdata-web-app tail -f /app/logs/app.log
```

Check that NiFi sees the exact same file:

```bash
docker exec -it bigdata-nifi ls -lah /opt/nifi/app-logs
docker exec -it bigdata-nifi tail -f /opt/nifi/app-logs/app.log
```

## 9. Suggested NiFi Flow Reproduction

### Flow A: Raw Ingest To MinIO

Suggested processors:

1. `TailFile`
2. `SplitText` or `SplitRecord` if you want one JSON event per flow file
3. `PutS3Object`

Recommended input file in `TailFile`:

`/opt/nifi/app-logs/app.log`

Recommended MinIO settings in `PutS3Object`:

- Endpoint override: `http://minio:9000`
- Access key: `minioadmin`
- Secret key: `minioadmin123`
- Bucket example: `raw-app-logs`

### Flow B: Curated Load To ClickHouse

Suggested processors:

1. `ListS3`
2. `FetchS3Object`
3. `QueryRecord` or `JoltTransformJSON`
4. `PutDatabaseRecord` or `PutSQL`

Recommended ClickHouse JDBC/HTTP target:

- Host: `clickhouse`
- Port: `8123`

## 10. How The System Works End To End

1. A user visits the Next.js app and triggers normal page requests.
2. The custom server writes structured access logs into `app.log`.
3. Client-side tracking events are posted to `/api/track`.
4. The API still stores those events in MongoDB for the existing dashboard, but now it also writes raw structured activity logs into `app.log`.
5. The shared `app-logs` volume makes the same file visible inside NiFi.
6. NiFi ingests the file, lands raw data into MinIO, then reads or transforms that raw layer into ClickHouse-ready records.
7. Power BI connects to ClickHouse for analytics and reporting.

## 11. Recommended Demo Script

If you need to explain the setup live, this is the clean story:

1. Start the stack with `docker compose up -d --build`.
2. Open the storefront at `http://localhost:3000`.
3. Generate activity by browsing products and adding items to cart.
4. Show the raw JSON logs being appended in `logs/app.log`.
5. Show that NiFi can read the same file at `/opt/nifi/app-logs/app.log`.
6. Explain that NiFi sends raw logs to MinIO and curated analytics to ClickHouse.
7. Explain that Power BI sits on top of ClickHouse for dashboards.

Fast end-to-end checks I recommend

- Open http://localhost:3000 and generate some traffic.
  Confirm logs are growing:
- tail -f /home/adam/Desktop/big-data-app/logs/app.log
- Confirm NiFi can see the same file:
- docker exec -it bigdata-nifi tail -n 20 /opt/nifi/app-logs/app.log
- Open NiFi UI and create a simple TailFile processor pointed at:
- /opt/nifi/app-logs/app.log
  Open MinIO Console and create a bucket like raw-app-logs.
- Later connect NiFi PutS3Object to MinIO and verify objects appear in that bucket.
- Then load ClickHouse and verify rows with SQL.

## 12. Step-By-Step NiFi UI Setup

This section gives you the exact sequence to build the full pipeline:

`Web App -> NiFi -> MinIO -> NiFi -> ClickHouse`

### 12.0 NiFi Concepts Before You Click Anything

If NiFi is brand new to you, these are the four concepts that matter most:

- `Processor`: a single step in the pipeline. Think of it like one worker with one job.
- `Connection`: the arrow between processors. It moves data from one step to the next.
- `Relationship`: the outcome of a processor, such as `success`, `failure`, or `matched`.
- `Controller Service`: shared credentials or shared configuration used by multiple processors.

What NiFi moves around:

- NiFi moves `FlowFiles`.
- A FlowFile is not just the file content. It is:
  - `content`: the body, such as one JSON log line
  - `attributes`: metadata, such as filename, route, s3 bucket, or extracted JSON fields

Why this matters in your pipeline:

- Flow A moves raw file content from the app log into MinIO.
- Flow B reads raw objects back from MinIO, turns one line into one FlowFile, extracts fields into attributes, converts those attributes back into clean JSON, and sends that JSON to ClickHouse.

What you will see on screen in NiFi:

- The big white area is the `canvas`.
- The left-side toolbar is where you add processors, funnels, ports, labels, and process groups.
- A processor stays `invalid` until every required property is filled in and every relationship is either connected or auto-terminated.
- A red exclamation mark means NiFi is telling you exactly what is missing. Right-click the component and choose `View configuration` or `Configure` to fix it.

### 12.1 Open The UIs

Open these in your browser:

- NiFi UI: `https://localhost:8443/nifi/`
- MinIO Console: `http://localhost:9001`
- ClickHouse HTTP / ClickStack UI: `http://localhost:8123`

NiFi uses a self-signed certificate, so your browser will likely show a warning the first time.

Login values:

- NiFi username: `admin`
- NiFi password: `ChangeMeNifi123!`
- MinIO username: `minioadmin`
- MinIO password: `minioadmin123`
- ClickHouse username: `analytics_user`
- ClickHouse password: `Analytics123!`

What each UI is for:

- NiFi UI is where you design and run the pipeline.
- MinIO Console is where you verify the raw data lake objects were written.
- ClickHouse at `http://localhost:8123` is the database HTTP endpoint. Depending on the build, you may also see the embedded ClickStack browser UI there. If it prompts for credentials, use the ClickHouse username and password above.

### 12.2 Create The MinIO Bucket

In MinIO Console:

1. Open `Buckets`.
2. Click `Create Bucket`.
3. Create a bucket named `raw-app-logs`.
4. Open the bucket once so you can confirm later that objects appear there.

This bucket will store the raw JSON log files exactly as NiFi receives them from the app.

Why we do this first:

- `PutS3Object` cannot write to a bucket that does not exist.
- Creating the bucket before building the flow removes one of the most common first-time errors.

### 12.3 Create The ClickHouse Database And Tables

Run these commands from the VM terminal.

If you are following this guide after the credentials fix, these commands use the dedicated ClickHouse user we created for network access:

```bash
docker exec -i bigdata-clickhouse clickhouse-client \
  --user analytics_user \
  --password 'Analytics123!' <<'SQL'
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.app_logs_curated
(
    timestamp String,
    event String,
    route String,
    requestRoute String,
    method String,
    responseTimeMs String,
    userAgent String,
    statusCode String,
    remoteAddress String,
    activityType String,
    userId String,
    sessionId String,
    stage String,
    status String,
    inserted String,
    orderNumber String,
    orderId String,
    total String,
    subtotal String,
    shippingFee String,
    itemCount String,
    paymentMethod String,
    errorMessage String
)
ENGINE = MergeTree
ORDER BY (event, timestamp);

CREATE OR REPLACE VIEW analytics.app_logs_dashboard AS
SELECT
    parseDateTimeBestEffortOrNull(timestamp) AS ts,
    event,
    route,
    requestRoute,
    method,
    toFloat64OrNull(responseTimeMs) AS response_time_ms,
    toUInt16OrNull(statusCode) AS status_code,
    remoteAddress AS remote_address,
    activityType AS activity_type,
    userId AS user_id,
    sessionId AS session_id,
    stage,
    status,
    paymentMethod AS payment_method,
    userAgent AS user_agent,
    errorMessage AS error_message
FROM analytics.app_logs_curated;
SQL
```

Why this schema is simple on purpose:

- Raw logs stay untouched in MinIO.
- NiFi extracts only the analytics-friendly top-level fields into ClickHouse.
- This avoids fighting with nested JSON objects such as `query` and `metadata` during the first version of the pipeline.

What these database objects are:

- `analytics.app_logs_curated` is the physical table NiFi will insert into.
- `analytics.app_logs_dashboard` is a view that casts some string fields into query-friendly types like timestamps and numbers.

### 12.4 Create A NiFi Process Group

In NiFi:

1. On the main canvas, find the `Process Group` icon in the left toolbar.
2. Drag it onto the canvas.
3. When the popup appears, set the name to `bigdata-pipeline`.
4. Click `Add`.
5. Double-click the new process group to enter it.

Inside it, create two sub-groups:

- `01-raw-to-minio`
- `02-minio-to-clickhouse`

Why use process groups:

- They keep the canvas understandable.
- They let you isolate one stage at a time.
- They make it easier to stop, start, and troubleshoot one half of the pipeline without touching the other.

### 12.5 Create The AWS Credentials Controller Service For MinIO

NiFi S3 processors can talk to MinIO because MinIO is S3-compatible.

Inside the `bigdata-pipeline` process group:

1. Click anywhere on empty canvas space so nothing is selected.
2. In the left operation menu, click `Configure`.
3. Open the `Controller Services` tab.
4. Click the `+` button.
5. Search for `AWSCredentialsProviderControllerService`.
6. Select it and click `Add`.
7. In the new row, click the gear icon `Configure`.
8. Open the `Properties` tab.
9. Set:
   - `Access Key ID` = `minioadmin`
   - `Secret Access Key` = `minioadmin123`
   - `Use Default Credentials` = `false`
10. Click `Apply`.
11. Back in the Controller Services table, click the lightning bolt `Enable`.

### 12.6 Build Flow A: Web App Logs To MinIO

Goal:

- NiFi tails the app log file at `/opt/nifi/app-logs/app.log`
- NiFi writes raw log files into the MinIO bucket `raw-app-logs`

Create these processors in `01-raw-to-minio`:

1. `TailFile`
2. `UpdateAttribute`
3. `PutS3Object`

Connect them:

`TailFile -> UpdateAttribute -> PutS3Object`

How to add a processor:

1. Open the `01-raw-to-minio` process group.
2. Drag the `Processor` icon from the left toolbar onto the canvas.
3. Search for the processor name.
4. Double-click the processor or select it and click `Add`.
5. Repeat until all three processors are on the canvas.

How to connect processors:

1. Hover over the first processor until the connect arrow appears.
2. Drag from `TailFile` to `UpdateAttribute`.
3. In the connection dialog, choose the `success` relationship and click `Add`.
4. Repeat from `UpdateAttribute` to `PutS3Object`.

Configure `TailFile`:

1. Right-click `TailFile`.
2. Click `Configure`.
3. Open the `Properties` tab.
4. Set:

- `Tailing Mode` = `Single file`
- `Files to Tail` = `/opt/nifi/app-logs/app.log`
- `Initial Start Position` = `Beginning of File`
- `State Location` = `Local`
5. Open the `Scheduling` tab.
6. Set `Run Schedule` = `5 sec`
7. Click `Apply`

Configure `UpdateAttribute`:

1. Right-click `UpdateAttribute`.
2. Click `Configure`.
3. Open the `Properties` tab.
4. Add this dynamic property:

- `filename` = `app-log-${now():format("yyyyMMddHHmmssSSS")}-${UUID()}.json`

This gives every raw object in MinIO a unique name.

Why `UpdateAttribute` exists:

- `TailFile` reads chunks from one growing file.
- If we uploaded every chunk using the same object name, MinIO would keep overwriting older objects.
- We generate a fresh object key so each chunk becomes a separate raw object in the lake.

Configure `PutS3Object`:

1. Right-click `PutS3Object`.
2. Click `Configure`.
3. Open the `Properties` tab.
4. Set:

- `Bucket` = `raw-app-logs`
- `Object Key` = `${filename}`
- `Region` = `Use Custom Region`
- `Custom Region` = `us-east-1`
- `Endpoint Override URL` = `http://minio:9000`
- `Use Path Style Access` = `true`
- `AWS Credentials Provider Service` = the MinIO credentials controller service you created
5. Open the `Settings` tab if needed and give it a friendly name such as `Put raw logs to MinIO`
6. Click `Apply`

Recommended relationship handling:

1. Right-click `PutS3Object` and choose `Configure`
2. Open `Relationships`
3. Check `success` under auto-terminate
4. Leave `failure` un-terminated so you can see errors while testing
5. Click `Apply`

Why auto-terminate `success`:

- `PutS3Object` is the end of Flow A.
- A successful FlowFile is finished and does not need another step.

### 12.7 Build Flow B: MinIO Raw Logs To ClickHouse

Goal:

- NiFi lists raw objects from MinIO
- NiFi fetches them
- NiFi splits them into one JSON object per line
- NiFi extracts the fields you want for analytics
- NiFi pushes the curated rows into ClickHouse through the HTTP interface

Create these processors in `02-minio-to-clickhouse`:

1. `ListS3`
2. `FetchS3Object`
3. `SplitText`
4. `EvaluateJsonPath`
5. `AttributesToJSON`
6. `InvokeHTTP`

Connect them:

`ListS3 -> FetchS3Object -> SplitText -> EvaluateJsonPath -> AttributesToJSON -> InvokeHTTP`

How to add and connect them:

1. Open the `02-minio-to-clickhouse` process group.
2. Add the six processors the same way you added Flow A.
3. Connect each processor to the next using the `success` relationship.

Configure `ListS3`:

1. Right-click `ListS3`
2. Click `Configure`
3. Open `Properties`
4. Set:

- `Bucket` = `raw-app-logs`
- `Region` = `Use Custom Region`
- `Custom Region` = `us-east-1`
- `Endpoint Override URL` = `http://minio:9000`
- `Use Path Style Access` = `true`
- `AWS Credentials Provider Service` = the MinIO credentials controller service
- `Minimum Object Age` = `0 sec`
5. Open `Scheduling`
6. Set `Run Schedule` = `1 min`
7. Click `Apply`

Why `ListS3` comes before `FetchS3Object`:

- `ListS3` does not download file content.
- It only discovers which objects exist and creates FlowFiles with S3 metadata.
- `FetchS3Object` then uses that metadata to actually download each object.

Configure `FetchS3Object`:

1. Right-click `FetchS3Object`
2. Click `Configure`
3. Open `Properties`
4. Set:

- `Bucket` = `${s3.bucket}`
- `Object Key` = `${filename}`
- `Region` = `Use Custom Region`
- `Custom Region` = `us-east-1`
- `Endpoint Override URL` = `http://minio:9000`
- `Use Path Style Access` = `true`
- `AWS Credentials Provider Service` = the MinIO credentials controller service
5. Click `Apply`

Configure `SplitText`:

1. Right-click `SplitText`
2. Click `Configure`
3. Open `Properties`
4. Set:

- `Line Split Count` = `1`
- `Header Line Count` = `0`
- `Remove Trailing Newlines` = `true`
5. Click `Apply`

This makes each log line become one FlowFile.

Why `SplitText` matters:

- Each MinIO object may contain many JSON log lines.
- ClickHouse inserts are much easier if NiFi works with one JSON event at a time.

Configure `EvaluateJsonPath`:

1. Right-click `EvaluateJsonPath`
2. Click `Configure`
3. Open `Properties`
4. Set:
   - `Destination` = `flowfile-attribute`
   - `Return Type` = `scalar`
   - `Path Not Found Behavior` = `skip`
5. Add the following dynamic properties:

- `timestamp` = `$.timestamp`
- `event` = `$.event`
- `route` = `$.route`
- `requestRoute` = `$.requestRoute`
- `method` = `$.method`
- `responseTimeMs` = `$.responseTimeMs`
- `userAgent` = `$.userAgent`
- `statusCode` = `$.statusCode`
- `remoteAddress` = `$.remoteAddress`
- `activityType` = `$.activityType`
- `userId` = `$.userId`
- `sessionId` = `$.sessionId`
- `stage` = `$.stage`
- `status` = `$.status`
- `inserted` = `$.inserted`
- `orderNumber` = `$.orderNumber`
- `orderId` = `$.orderId`
- `total` = `$.total`
- `subtotal` = `$.subtotal`
- `shippingFee` = `$.shippingFee`
- `itemCount` = `$.itemCount`
- `paymentMethod` = `$.paymentMethod`
- `errorMessage` = `$.errorMessage`
6. Click `Apply`

Why `Path Not Found Behavior = skip`:

- Not every log line has every field.
- For example, `http_access` lines have `statusCode`, but user activity lines may not.
- `skip` prevents missing optional fields from breaking the flow.

Configure `AttributesToJSON`:

1. Right-click `AttributesToJSON`
2. Click `Configure`
3. Open `Properties`
4. Set:
   - `Destination` = `flowfile-content`
   - `Include Core Attributes` = `false`
   - `Null Value` = `false`
   - `JSON Handling Strategy` = `Escaped`
   - `Attributes List` =
     `timestamp,event,route,requestRoute,method,responseTimeMs,userAgent,statusCode,remoteAddress,activityType,userId,sessionId,stage,status,inserted,orderNumber,orderId,total,subtotal,shippingFee,itemCount,paymentMethod,errorMessage`
5. Click `Apply`

This generates a clean curated JSON row for ClickHouse.

Configure `InvokeHTTP`:

1. Right-click `InvokeHTTP`
2. Click `Configure`
3. Open `Properties`
4. Set:
   - `HTTP Method` = `POST`
   - `HTTP URL` = `http://clickhouse:8123/?query=INSERT%20INTO%20analytics.app_logs_curated%20FORMAT%20JSONEachRow`
   - `Request Content-Type` = `application/json`
   - `Request Username` = `analytics_user`
   - `Request Password` = `Analytics123!`
5. Click `Apply`

Recommended relationship handling:

1. Open `Configure -> Relationships`
2. Auto-terminate `response`
3. Auto-terminate `original`
4. Leave `retry`, `failure`, and `no retry` visible during testing
5. Click `Apply`

Why `InvokeHTTP` works here:

- ClickHouse exposes an HTTP interface on port `8123`
- It accepts `INSERT ... FORMAT JSONEachRow`
- NiFi already turned each event into one JSON object, so sending FlowFile content directly is simple

How to start a processor in NiFi:

1. Once a processor has no validation errors, right-click it.
2. Click `Start`.
3. A running processor turns green.

If a processor will not start:

- right-click it
- choose `View configuration`
- look for red validation messages at the top or in the `Properties` tab

### 12.8 Start The Flows In Order

Start them in this order:

1. Enable the MinIO AWS credentials controller service.
2. Start `PutS3Object` flow components in `01-raw-to-minio`.
3. Generate app traffic on `http://localhost:3000`.
4. Confirm raw files appear in MinIO.
5. Start `02-minio-to-clickhouse`.
6. Confirm rows appear in ClickHouse.

### 12.9 Verify Each Stage

Verify NiFi can still see the live source log:

```bash
docker exec -it bigdata-nifi tail -n 20 /opt/nifi/app-logs/app.log
```

Verify MinIO bucket objects:

1. Open `http://localhost:9001`
2. Open bucket `raw-app-logs`
3. You should see JSON objects arriving

Verify ClickHouse rows:

```bash
docker exec -it bigdata-clickhouse clickhouse-client --user analytics_user --password 'Analytics123!' --query "SELECT count() FROM analytics.app_logs_curated"
docker exec -it bigdata-clickhouse clickhouse-client --user analytics_user --password 'Analytics123!' --query 'SELECT ts,event,route,method,status_code,response_time_ms FROM analytics.app_logs_dashboard ORDER BY ts DESC LIMIT 20 FORMAT PrettyCompactMonoBlock'
```

### 12.10 What Dashboard Can You View Right Now

Available dashboards and UIs right now:

- NiFi UI is the pipeline dashboard
- MinIO Console is the raw data lake dashboard
- `http://localhost:3000/admin` is the current application event dashboard backed by MongoDB

ClickHouse in this stack does not ship with a rich dashboard UI by default.

What you are seeing at `http://localhost:8123`:

- In current ClickHouse builds, the HTTP endpoint can also expose the embedded ClickStack UI.
- If it asks for a username and password, use:
  - Username: `analytics_user`
  - Password: `Analytics123!`
- If it asks for a database, use `analytics`

For ClickHouse today, your best options are:

- Query it with `clickhouse-client`
- Connect Power BI to ClickHouse
- Optionally add a BI tool later such as Grafana, Superset, or Metabase

## 13. Troubleshooting Notes

If NiFi cannot write to MinIO:

- Recheck `Endpoint Override URL = http://minio:9000`
- Recheck `Use Path Style Access = true`
- Recheck the MinIO access key and secret key

If NiFi cannot fetch from MinIO:

- Make sure bucket `raw-app-logs` exists
- Confirm raw objects were created by Flow A first

If ClickHouse rows are not appearing:

- Check `InvokeHTTP` bulletin messages in NiFi
- Confirm the table `analytics.app_logs_curated` exists
- Confirm `InvokeHTTP` is posting to `http://clickhouse:8123`

If the same S3 objects are being reprocessed:

- Do not clear `ListS3` state unless you intentionally want a replay
- If you do want a replay, stop `ListS3`, clear its state, and start it again

If you want stronger analytics later:

- Keep raw logs in MinIO exactly as they are now
- Add a second curated ClickHouse table with typed numeric columns
- Load that typed table from a refined NiFi transformation or a ClickHouse materialized view
