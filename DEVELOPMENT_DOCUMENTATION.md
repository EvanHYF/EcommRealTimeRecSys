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