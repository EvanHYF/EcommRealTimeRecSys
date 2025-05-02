# Technical Documentation

## 1. Architecture Overview

flowchart LR
subgraph Data Collection
EcomSim["E-commerce\nSimulator"] -->|produce events| KafkaCluster["Kafka\n3-node Cluster"]
end

subgraph Consumption
KafkaCluster -->|consume| PartitionMonitor["Partition Monitor\n(ZooKeeper)"]
PartitionMonitor --> ConsumerWorker["ConsumerWorker.js\n(1 process per partition)"]
ConsumerWorker -->|HTTP POST| ExpressAPI["Backend\nNode.js/Express"]
ConsumerWorker -->|SADD UV sets| RedisUV["Redis\n`pageviews:…` sets"]
end

subgraph Processing
KafkaCluster -->|stream to| FlinkJob["Flink\nReal-time Job"]
FlinkJob -->|write interest tags| RedisProfile["Redis\n`user:interest:<id>`"]
end

subgraph Storage & API
ExpressAPI -->|writes events| RedisEvents["Redis\n`events` list"]
ExpressAPI -->|reads profiles| RedisProfile
ExpressAPI -->|reads UV| RedisUV
ExpressAPI -->|reads user profiles| RedisUserProfile["Redis\n`user-profiles` hash"]
ExpressAPI -->|serves| FrontendUI["Frontend\n(React.js)"]
end

subgraph Monitoring
ExpressAPI -->|/metrics| Prometheus["Prometheus"]
RedisExporter["redis-exporter"] --> Prometheus
KafkaExporter["kafka-exporter"] --> Prometheus
Prometheus --> Grafana["Grafana"]
end


- **Kafka** captures user “view”, “add-to-cart” and “purchase” events.
- **Partition Monitor & ConsumerWorkers** auto-scale consumers based on ZooKeeper’s `/brokers/topics/.../partitions`.
- **Backend (Express)** exposes REST endpoints for ingestion, profiles, recommendations, and `/metrics`.
- **Flink** continuously computes per-user interest tags and writes them to Redis.
- **Redis** stores events list, daily UV sets, user profiles (`user:profile:<id>`), and interest tags (`user:interest:<id>`).
- **Prometheus & Grafana** scrape `/metrics` and exporters to visualize QPS, latency, error rates, Redis/Kafka metrics.

---

## 2. Component Breakdown

### 2.1 E-commerce Simulator
- Generates synthetic user events at configured rates.
- HTTP or Kafka producer sends JSON messages to Kafka topics.

### 2.2 Kafka Cluster
- **3 brokers**, each with advertised listeners on ports 9093–9095.
- Topics: `view-events`, `add-to-cart-events`, `purchase-events`, `user-interest-tags-topic`.
- **Replication factor = 3**, **partitions = 3** for high availability & parallelism.

### 2.3 Partition Monitor & ConsumerWorkers
- **`partitionMonitor.js`** watches ZooKeeper for partition changes and forks/kills `consumerWorker.js` processes.
- **`consumerWorker.js`**: single-partition Kafka consumer that:
    1. Processes events (tracks UV in Redis for `view-events`).
    2. Forwards raw events to Backend via HTTP POST.

### 2.4 Backend (Node.js / Express)
- **Ingestion endpoint**: `POST /api/user-behavior` → stores events in Redis list `events`.
- **Profile endpoints**:
    - `GET /api/user-profile/:userId` → `HGET` from `user-profiles` hash.
    - `POST /api/user-profiles` → batch `HGET`.
- **Recommendation endpoint**: `GET /api/recommendations/:userId` →
    1. `getUserInterest(userId)` from `UserInterestTag` hash.
    2. Maps interest tag array to product objects.
- **UV & events APIs**: `GET /api/uv-data`, `GET /api/user-behavior`.
- **Metrics endpoint**: `GET /metrics` via `prom-client`.

### 2.5 Flink Job
- Reads from Kafka topics in real time.
- Applies weights (`view=1, add_to_cart=3, purchase=5`) to events.
- Aggregates per-user tag scores.
- Writes `UserProfile` and `UserInterestTag` back to Redis via custom mappers.

### 2.6 Redis
- **Events list**: `LPUSH`/`RPUSH` JSON strings.
- **UV sets**: `SADD pageviews:YYYY-MM-DD:<product> userId`.
- **User Profiles**: `HSET user:profile:<userId> <tag> <score>`.
- **Interest Tags**: `HSET UserInterestTag <userId> <JSON-array>`.

### 2.7 Monitoring & Alerting
- **Prometheus** scrapes:
    - `process_cpu_seconds_total`, `process_resident_memory_bytes` (Node.js).
    - Custom histograms: `http_request_duration_ms_bucket`.
    - Redis & Kafka exporters.
- **Grafana** dashboards display QPS, p95/p99 latency, error rate, event-loop lag.

---

## 3. Fault-Tolerance Solutions

### 3.1 Kafka
- **Replication** (RF=3) ensures no data loss if a broker fails.
- **ZooKeeper** quorum (≥2/3) for broker metadata.

### 3.2 Consumer Auto-Scaling
- **Dynamic**: detects partition adds/removes and adjusts consumers without downtime.

### 3.3 Redis
- Critical data (profiles, hot hash) can be **replicated** via Redis Sentinel or cluster mode.
- **Preloader** script (`redisPreloader.js`) warms hot hash every 5m, enabling read-only fallback if primary shards are slow.

### 3.4 Flink
- **Checkpointing** enabled (configure in `flink-project`), for stateful recovery.
- **High-availability** setup on JobManager via ZooKeeper.

### 3.5 Backend
- **Graceful error handling**: missing profiles default to empty responses.
- **CORS** and **body-parser** timeouts configured.

### 3.6 Monitoring & Alerts
- **Prometheus Alertmanager** rules:
    - Node.js CPU > 80% for 2m
    - HTTP error rate > 1%
    - Redis command latency p95 > 20ms
- **Grafana** alert notifications via email/Slack.

---

## 4. Optimization Details

### 4.1 Hot-Data Preloading
- `redisPreloader.js` scans daily UV sets and writes counts to `hot:pageview_counts` hash.
- Reduces per-request `SCARD` operations to fast `HGET`.

### 4.2 Consumer Scaling
- Partition monitor forks one process per partition—maximizes parallel throughput.
- Consumers grouped by partition avoid rebalancing thrash.

### 4.3 Backend Performance
- **Histogram** metrics for latency breakdown.
- **Node.js cluster** support recommended for multicore utilization.

### 4.4 Flink Tuning
- Parallelism set to `num_partitions`.
- RocksDB state backend for large state, with incremental checkpoints.

### 4.5 Deployment & CI/CD
- **Docker Compose** for local dev.
- **Kubernetes** manifests (future): StatefulSet for Kafka, Deployment for backend & Flink.
- **Health checks** and **readiness probes** on `/metrics`.

---

## 5. Next Steps

1. Migrate Redis to clustered mode for higher throughput & HA.
2. Add distributed Locust workers for multi-machine stress tests.
3. Implement canary deployments for algorithm weight updates.
4. Integrate Alertmanager with incident response playbooks.
5. Document disaster-recovery procedures (backups, restores).

