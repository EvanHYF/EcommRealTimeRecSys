const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS

// Redis client configuration
const redisClient = redis.createClient({
    url: 'redis://localhost:6379' // Redis address
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Clear old data from Redis
async function clearOldData() {
    try {
        // Delete the events list
        await redisClient.del('events');

        // Delete all keys related to pageviews
        const keys = await redisClient.keys('pageviews:*');
        for (const key of keys) {
            await redisClient.del(key);
        }

        console.log('Old data cleared from Redis');
    } catch (err) {
        console.error('Error clearing old data from Redis:', err);
    }
}

// Retrieve user behavior events
app.get('/api/user-behavior', async (req, res) => {
    try {
        const events = await redisClient.lRange('events', 0, -1); // Get all events
        res.json(events.map(event => JSON.parse(event))); // Return parsed events
    } catch (err) {
        res.status(500).send(err);
    }
});

// Retrieve Unique Visitor (UV) data
app.get('/api/uv-data', async (req, res) => {
    try {
        const keys = await redisClient.keys('pageviews:*'); // Get all pageviews keys
        const uvData = {};

        // Iterate through each key and get UV data
        for (const key of keys) {
            const [prefix, date, product] = key.split(':'); // Parse key name
            const uvCount = await redisClient.sCard(key); // Get the size of the set

            // Organize UV data by date and product
            if (!uvData[date]) {
                uvData[date] = {};
            }

            uvData[date][product] = uvCount;
        }

        res.json(uvData); // Return UV data
    } catch (err) {
        res.status(500).send(err);
    }
});

// Receive user behavior events
app.post('/api/user-behavior', async (req, res) => {
    const event = req.body; // Get event data from request body
    try {
        await redisClient.rPush('events', JSON.stringify(event)); // Store event in Redis list
        res.status(201).send(); // Return success status
    } catch (err) {
        res.status(500).send(err);
    }
});

// Start the server
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    // Clear old data from Redis
    await clearOldData();

    // Start ecommerceSimulator.js
    // exec('node src/ecommerceSimulator.js', (err, stdout, stderr) => {
    //     if (err) {
    //         console.error(`Error starting ecommerceSimulator.js: ${err}`);
    //         return;
    //     }
    //     console.log(`ecommerceSimulator.js output: ${stdout}`);
    //     console.error(`ecommerceSimulator.js error output: ${stderr}`);
    // });
    //
    // // Start eventProcessor.js
    // exec('node src/eventProcessor.js', (err, stdout, stderr) => {
    //     if (err) {
    //         console.error(`Error starting eventProcessor.js: ${err}`);
    //         return;
    //     }
    //     console.log(`eventProcessor.js output: ${stdout}`);
    //     console.error(`eventProcessor.js error output: ${stderr}`);
    // });
});
