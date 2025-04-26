// A Kafka consumer bound to a specific partition
require('dotenv').config();
const kafka = require('kafka-node');
const redis = require('redis');
const axios = require('axios');

// CLI args: [topic, partition]
const topic = process.argv[2];
const partition = parseInt(process.argv[3], 10);

// Kafka client and consumer
const kafkaClient = new kafka.KafkaClient({
    kafkaHost: process.env.KAFKA_HOST
});
const consumer = new kafka.Consumer(
    kafkaClient,
    [{ topic, partition }],
    { autoCommit: true }
);

// Redis client (using mapped port)
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on('error', err => console.error(`[consumerWorker] Redis error:`, err));
redisClient.connect().catch(console.error);

consumer.on('message', async message => {
    console.log(`[${topic}-${partition}] Received:`, message.value);
    try {
        const event = JSON.parse(message.value);
        await axios.post(process.env.BACKEND_API, event);
    } catch (err) {
        console.error(`[${topic}-${partition}] Processing error:`, err);
    }
});

consumer.on('error', err => console.error(`[${topic}-${partition}] Kafka error:`, err));

// graceful shutdown
['SIGINT','SIGTERM'].forEach(sig => process.on(sig, () => {
    consumer.close(true, () => process.exit(0));
}));