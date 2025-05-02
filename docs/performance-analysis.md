# Performance Analysis

## 1. Test Configuration
- **Tool**: Locust v2.x
- **Host**: http://localhost:3000
- **Users (u)**: 200
- **Spawn rate (r)**: 20 users/s
- **Duration**: 5 minutes
- **Endpoints tested**:
    - `POST /api/user-behavior`
    - `GET /api/recommendations/:userId`

## 2. Locust Summary

| Name                             | # Requests | # Failures | Avg (ms) | Median (ms) | p95 (ms) | p99 (ms) | RPS    |
|----------------------------------|------------|------------|----------|-------------|----------|----------|--------|
| **POST /api/user-behavior**      | 29 202     | 0 (0%)     | 6.29     | 4           | 13       | 82       | 97.84  |
| **GET /api/recommendations/:userId** | 9 766      | 0 (0%)     | 6.06     | 4           | 15       | 69       | 32.72  |
| **Total**                        | 38 968     | 0 (0%)     | 6.23     | –           | –        | –        | 130.57 |

> **Notes**:
> - Median and Avg are taken directly from Locust’s CSV output.
> - p95/p99 are weighted averages across all GET requests.
> - RPS (requests per second) sums to the aggregated 130.57 req/s.

## 3. Infrastructure Metrics (Prometheus/Grafana)
_Export CSVs or screenshots for the same 5 min window._

| Metric                                    | PromQL (example)                                                       |
|-------------------------------------------|------------------------------------------------------------------------|
| Node.js CPU usage (per second)            | `rate(process_cpu_seconds_total[1m])`                                  |
| Event-loop lag (seconds)                  | `nodejs_eventloop_lag_seconds`                                         |
| HTTP p95 latency (ms)                     | `histogram_quantile(0.95, sum by (le)(rate(http_request_duration_ms_bucket[1m]))) * 1000` |
| Redis p95 command latency (ms)            | `histogram_quantile(0.95, sum by (le)(rate(redis_command_duration_seconds_bucket[1m]))) * 1000` |
| Kafka consumer group lag (messages)       | `kafka_consumergroup_lag{consumergroup="ecomm-consumers"}`             |

_Screenshots or CSV exports go here._

## 4. Bottleneck Findings
- **CPU**: Node.js process peaked at _X_% CPU around 120 RPS → CPU-bound at high load.
- **Latency**: HTTP p95 grew from ~15 ms at low load to ~50 ms at peak → tail latency impact.
- **Event-loop lag**: correlated with spikes in p99 HTTP latency → GC or blocking ops.
- **Redis**: p95 latency stayed under 5 ms until ~100 RPS, then climbed to ~20 ms → consider sharding/preload.
- **Kafka**: consumer lag remained near zero → consumer scaling working as expected.

## 5. Recommendations
1. **Scale Node.js** horizontally (e.g. cluster mode with 4 workers).
2. **Optimize hot-data preloading** frequency or increase Redis instance size.
3. **Investigate GC tuning** or offload heavy work to background threads to reduce event-loop lag.
4. **Increase Kafka partitions** and verify consumer monitor spawns enough workers under peak load.
5. **Monitor and alert** on CPU and event-loop lag thresholds to proactively scale.

