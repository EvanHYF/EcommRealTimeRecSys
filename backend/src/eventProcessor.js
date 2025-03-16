const kafka = require('kafka-node');
const redis = require('redis');
const axios = require('axios');

// Use localhost and mapped ports
const client = new kafka.KafkaClient({
    kafkaHost: 'localhost:9093,localhost:9094,localhost:9095'
});

const topics = [
    { topic: 'view-events', partitions: 3, replicationFactor: 2 },
    { topic: 'add-to-cart-events', partitions: 3, replicationFactor: 2 },
    { topic: 'purchase-events', partitions: 3, replicationFactor: 2 },
    { topic: 'user-interest-tags-topic', partitions: 3, replicationFactor: 2 }
];

// Check and create topics if they do not exist
client.createTopics(topics, (err, result) => {
    if (err) {
        console.error('Error creating topics:', err);
    } else {
        console.log('Topics created or already exist:', result);
    }

    // Check if topics already exist or were created successfully
    if (result.every(r => r.error && r.error.includes('already exists'))) {
        console.log('All topics already exist. Starting consumer...');
        startConsumer();
    } else if (result.every(r => !r.error || r.error.includes('already exists'))) {
        console.log('Some topics were created or already exist. Starting consumer...');
        startConsumer();
    } else {
        console.error('Failed to create some topics. Not starting consumer.');
    }
});

function startConsumer() {
    const consumer = new kafka.Consumer(
        client,
        topics.map(t => ({ topic: t.topic, partition: 0 })),
        {
            autoCommit: true
        }
    );

    const redisClient = redis.createClient({
        url: 'redis://localhost:6479'
    });
    redisClient.on('error', (err) => {
        console.error('Redis error:', err);
    });
    redisClient.connect().catch(console.error);

    consumer.on('message', async (message) => {
        console.log('Received message:', message);

        try {
            // Process the message based on the topic
            const event = JSON.parse(message.value);
            switch (message.topic) {
                case 'view-events':
                    await handleViewEvent(event);
                    break;
                case 'add-to-cart-events':
                    await handleAddToCartEvent(event);
                    break;
                case 'purchase-events':
                    await handlePurchaseEvent(event);
                    break;
                default:
                    console.error('Unknown topic:', message.topic);
            }

            // Send the event to the backend API
            await axios.post('http://localhost:3000/api/user-behavior', event);
            console.log('Event sent to backend');
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    consumer.on('error', (err) => {
        console.error('Kafka Consumer error:', err);
    });

    async function handleViewEvent(event) {
        console.log('Processing view event:', event);
        await trackPageView(event);
    }

    async function handleAddToCartEvent(event) {
        console.log('Processing add-to-cart event:', event);
        // Add logic to handle add-to-cart event here
    }

    async function handlePurchaseEvent(event) {
        console.log('Processing purchase event:', event);
        // Add logic to handle purchase event here
    }

    async function trackPageView(event) {
        const { userId, product, timestamp } = event;
        const date = timestamp.split('T')[0]; // Extract the date part from the timestamp

        // Use Redis set to track unique user IDs per day
        const redisKey = `pageviews:${date}:${product}`;
        try {
            const reply = await redisClient.sAdd(redisKey, userId);
            console.log(`Tracked page view for user ${userId} on product ${product}:`, reply);
        } catch (err) {
            console.error('Failed to track page view in Redis:', err);
        }
    }

    // Handle process exit to properly close Redis client
    function handleExit() {
        redisClient.quit();
        process.exit();
    }

    process.on('exit', handleExit);
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
}