const kafka = require('kafka-node');
const redis = require('redis');
const axios = require('axios');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9093,localhost:9094,localhost:9095' });
const consumer = new kafka.Consumer(
    client,
    [
        { topic: 'view-events', partition: 0 },
        { topic: 'add-to-cart-events', partition: 0 },
        { topic: 'purchase-events', partition: 0 }
    ],
    {
        autoCommit: true
    }
);

const redisClient = redis.createClient();
redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});
redisClient.connect().catch(console.error);

consumer.on('message', (message) => {
    console.log('Received message:', message);

    // Process the message based on the topic
    const event = JSON.parse(message.value);
    switch (message.topic) {
        case 'view-events':
            handleViewEvent(event);
            break;
        case 'add-to-cart-events':
            handleAddToCartEvent(event);
            break;
        case 'purchase-events':
            handlePurchaseEvent(event);
            break;
        default:
            console.error('Unknown topic:', message.topic);
    }

    // Send event to backend API
    axios.post('http://localhost:3000/api/user-behavior', event)
        .then(response => console.log('Event sent to backend:', response.status))
        .catch(error => console.error('Error sending event to backend:', error));
});

consumer.on('error', (err) => {
    console.error('Kafka Consumer error:', err);
});

function handleViewEvent(event) {
    console.log('Processing view event:', event);
    trackPageView(event);
}

function handleAddToCartEvent(event) {
    console.log('Processing add-to-cart event:', event);
    // Add your logic to process add-to-cart events here
}

function handlePurchaseEvent(event) {
    console.log('Processing purchase event:', event);
    // Add your logic to process purchase events here
}

async function trackPageView(event) {
    const { userId, product, timestamp } = event;
    const date = timestamp.split('T')[0]; // Extract the date part from the timestamp

    // Use a Redis set to track unique user IDs for each day
    const redisKey = `pageviews:${date}:${product}`;
    try {
        const reply = await redisClient.sAdd(redisKey, userId);
        console.log(`Tracked page view for user ${userId} on product ${product}:`, reply);
    } catch (err) {
        console.error('Failed to track page view in Redis:', err);
    }
}

// Handle process exit to properly close the Redis client
process.on('exit', () => {
    redisClient.quit();
});
process.on('SIGINT', () => {
    redisClient.quit();
    process.exit();
});
process.on('SIGTERM', () => {
    redisClient.quit();
    process.exit();
});