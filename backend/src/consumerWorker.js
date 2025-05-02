// backend/src/consumerWorker.js
require('dotenv').config();
const { fork } = require('child_process');
const kafka = require('kafka-node');
const redis = require('redis');
const axios = require('axios');

const [,, TOPIC, PARTITION] = process.argv;
const KAFKA_HOST = process.env.KAFKA_HOST;
const REDIS_URL  = process.env.REDIS_URL;
const BACKEND_API = process.env.BACKEND_API;

async function start() {
    // Redis client for UV tracking
    const redisClient = redis.createClient({ url: REDIS_URL });
    redisClient.on('error', console.error);
    await redisClient.connect();

    // Kafka consumer on a single partition
    const client = new kafka.KafkaClient({ kafkaHost: KAFKA_HOST });
    const consumer = new kafka.Consumer(
        client,
        [{ topic: TOPIC, partition: Number(PARTITION) }],
        { autoCommit: true }
    );

    consumer.on('message', async message => {
        const event = JSON.parse(message.value);
        try {
            // track pageview if needed
            if (TOPIC === 'view-events') {
                const date = event.timestamp.split('T')[0];
                await redisClient.sAdd(`pageviews:${date}:${event.product}`, event.userId);
            }
            // forward to backend API
            await axios.post(BACKEND_API, event);
        } catch (err) {
            console.error(`Error in worker ${TOPIC}[${PARTITION}]:`, err);
        }
    });

    consumer.on('error', console.error);

    // Clean up on exit
    process.on('SIGINT', async () => {
        await redisClient.quit();
        process.exit();
    });
}

start();
