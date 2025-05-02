# EcommRealTimeRecSys Development Documentation

## Project Background and Goals

EcommRealTimeRecSys is a real-time recommendation system designed to capture and analyze user behavior data, providing real-time recommendations for e-commerce platforms. The goal of this project is to enhance user experience and increase sales conversion rates.

## Architecture Design

The system architecture is designed as follows:

1. **Data Collection Layer**:
    - Kafka is used to capture user behavior data.
    - User behaviors include viewing products, adding to cart, and purchasing.

2. **Data Processing Layer**:
    - Kafka Streams and Spark Streaming are used for real-time data processing.
    - Redis is used as a caching layer to store intermediate computation results.

3. **Recommendation Service Layer**:
    - Real-time recommendation algorithms generate recommendations after data processing.
    - Zookeeper is used for service coordination and configuration management.

4. **Frontend Display Layer**:
    - The recommendation results are provided to the frontend via APIs.

## Major Components and Their Functions

### Kafka
- **Topics**:
    - `view-events`: Stores events of users viewing products.
    - `add-to-cart-events`: Stores events of users adding products to the cart.
    - `purchase-events`: Stores events of users purchasing products.

### Redis
- Used to cache intermediate computation results to improve data access speed.

### Zookeeper
- Used for service coordination and configuration management.

## Implementation Details

### Kafka Topic Creation

Use the following commands to create Kafka topics:

```bash
docker exec -it ecommrealtimerecsys-kafka1-1 kafka-topics --create --bootstrap-server localhost:9093 --replication-factor 3 --partitions 1 --topic view-events
docker exec -it ecommrealtimerecsys-kafka1-1 kafka-topics --create --bootstrap-server localhost:9093 --replication-factor 3 --partitions 1 --topic add-to-cart-events
docker exec -it ecommrealtimerecsys-kafka1-1 kafka-topics --create --bootstrap-server localhost:9093 --replication-factor 3 --partitions 1 --topic purchase-events
```

### Test Scripts

#### Kafka Test Script

```javascript name=tests/kafkaTest.js
const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9093,localhost:9094,localhost:9095' });
const producer = new kafka.Producer(client);
const consumer = new kafka.Consumer(
    client,
    [{ topic: 'view-events', partition: 0 }],
    { autoCommit: true }
);

const payloads = [
    { topic: 'view-events', messages: 'Hello Kafka', partition: 0 }
];

producer.on('ready', () => {
    producer.send(payloads, (err, data) => {
        if (err) {
            console.error('Error sending message:', err);
        } else {
            console.log('Message sent:', data);
        }
    });
});

producer.on('error', (err) => {
    console.error('Producer error:', err);
});

consumer.on('message', (message) => {
    console.log('Received message:', message);
});

consumer.on('error', (err) => {
    console.error('Consumer error:', err);
});
```

#### Redis Test Script

```javascript name=tests/redisTest.js
const redis = require('redis');

const client = redis.createClient({
    url: 'redis://localhost:6379'
});

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.on('connect', () => {
    console.log('Connected to Redis.');
});

const runTest = async () => {
    try {
        await client.connect();
        console.log('Redis client connected.');

        const setReply = await client.set('test-key', 'Hello Redis');
        console.log('Set reply:', setReply);

        const getReply = await client.get('test-key');
        console.log('Get reply:', getReply);

        await client.quit();
        console.log('Redis client disconnected.');
    } catch (err) {
        console.error('Error:', err);
    }
};

runTest();
```

#### Zookeeper Test Script

```javascript name=tests/zookeeperTest.js
const zookeeper = require('node-zookeeper-client');

const client = zookeeper.createClient('localhost:2181');
const path = '/test-znode';

client.once('connected', () => {
    console.log('Connected to Zookeeper.');

    client.create(path, Buffer.from('Hello Zookeeper'), (err) => {
        if (err) {
            console.error('Create error:', err);
        } else {
            console.log('Znode created.');

            client.getData(path, (err, data) => {
                if (err) {
                    console.error('Get data error:', err);
                } else {
                    console.log('Znode data:', data.toString());
                }
                client.close();
            });
        }
    });
});

client.connect();
```

## Testing Process and Results

### Kafka Test

After running `node tests/kafkaTest.js`, the expected output is:

```
Message sent: { 'view-events': { '0': 0 } }
Received message: { ... }
```

### Redis Test

After running `node tests/redisTest.js`, the expected output is:

```
Connected to Redis.
Redis client connected.
Set reply: OK
Get reply: Hello Redis
Redis client disconnected.
```

### Zookeeper Test

After running `node tests/zookeeperTest.js`, the expected output is:

```
Connected to Zookeeper.
Znode created.
Znode data: Hello Zookeeper
```

If the test scripts produce the expected output, it indicates that the Kafka, Redis, and Zookeeper clusters are functioning correctly.

## Core Business Implementation

### Flink Environment Setup and Real-time Interest Tag Computation
- **Build and deploy Flink job**
    - Navigate to the `flink-project` directory and package the job with Maven:
      ```bash
      cd flink-project
      mvn clean package
      ```  
    - The resulting `flink-project-1.0-SNAPSHOT.jar` is mounted into the JobManager container at `/flink-job.jar`.
- **Real-time tag computation**
    - In `UserInterestTagsJob.java`, consume from the Kafka topics `view-events`, `add-to-cart-events`, and `purchase-events`.
    - Assign scores to events (e.g. view = 1, add_to_cart = 3, purchase = 5) and aggregate per user into a `UserProfile` object.
    - Use the `RedisUserInterestMapper` to write updated tag scores into Redis.

### Redis User Profile Storage and Query Interfaces
- **Writing profiles to Redis**
    - The Flink job uses a Redis client (`jedis`) to HSET each user’s profile:
      ```
      HSET user:profile:<userId> <tag> <score>
      ```  
- **Backend query APIs**
    - In `backend/src/redisQueries.js`, implement:
      ```js
      async function getUserProfile(userId) {
        const data = await redisClient.hGetAll(`user:profile:${userId}`);
        return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Number(v)]));
      }
      async function getUserProfiles(userIds) {
        // batch hMGet or pipelined HGETALL for each user
      }
      ```  
  :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}

### Recommendation Service Integration
- **Fetching user profiles**
    - In `backend/src/recommendationService.js` call `getUserProfile(userId)` to retrieve the latest tag scores.
- **Simple recommendation algorithm**
    - Sort tags by descending score and apply any product-similarity or cold-start rules to generate the top-N recommendations.

### ZooKeeper Dynamic Configuration Center
- **Configuration node initialization**
    - In `backend/src/zookeeperClient.js`, ensure the ZK path `/config/recommendation/weights` exists and contains default weights:
      ```json
      { "view": 1, "add_to_cart": 3, "purchase": 5 }
      ```  
- **Runtime get/set API**
    - Expose `getConfig(path)` and `setConfig(path, value)` methods for retrieval and updates via the backend’s `/api/config/:path` endpoints. :contentReference[oaicite:2]{index=2}&#8203;:contentReference[oaicite:3]{index=3}

### Hot-Update of Recommendation Parameters
- **Parameter monitoring**
    - Implement a watcher or polling in `paramMonitor.js` that listens for changes to `/config/recommendation/weights`.
- **Applying new weights**
    - On update events, invoke `recommendationService.updateWeights(newWeights)` so the service immediately uses new parameters without a restart.

### Monitoring Setup (Prometheus & Grafana)
- **Prometheus instrumentation**
    - In `backend/src/index.js`, integrate `prom-client` to collect default and custom metrics, exposing them on `/metrics`.
    - Add Prometheus and exporters to `docker-compose.yml`.
- **Grafana dashboards**
    - Provision or manually import a dashboard that displays key KPIs:
        - HTTP QPS (`sum(rate(http_request_duration_ms_count[1m]))`)
        - p95 latency (`histogram_quantile(0.95, sum by (route, le)(rate(http_request_duration_ms_bucket[1m])))`)
        - Error rate (`sum(rate(...{status_code=~"5.."}[1m])) / sum(rate(...[1m])) * 100`)

### Documentation and Testing
- **Documentation**
    - This file captures all core business implementation details, from Flink job design through dynamic configuration and monitoring.
- **Unit tests**
    - Cover `redisQueries.js`, `recommendationService.js`, and `paramMonitor.js`.
- **Integration tests**
    - End-to-end scenarios in `tests/integration/systemIntegration.test.js` to verify Kafka → Flink → Redis → Recommendation API flow.
