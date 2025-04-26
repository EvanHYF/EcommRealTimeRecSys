const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const cors = require('cors');
const { exec } = require('child_process');
const redisQueries = require('./redisQueries'); // Import Redis query interface
const recommendationService = require('./recommendationService'); // Import recommendation service
const zkClient = require('./zookeeperClient'); // Import ZooKeeper client
const client = require('prom-client');
const app = express();
const port = process.env.PORT || 3000;

// collect default metrics (CPU, memory, event loop lag…)
client.collectDefaultMetrics({ timeout: 5000 });

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS

// Redis client configuration
const redisClient = redis.createClient({
    url: 'redis://localhost:6479' // Redis address
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.on('connect', () => {
    console.log('Redis client connected');
});

redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting');
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
        // Validate event data
        if (!event || !event.userId || !event.eventType || !event.product) {
            return res.status(400).json({
                success: false,
                message: 'Invalid event data. Required fields: userId, eventType, product.',
                data: null,
            });
        }

        // Store event in Redis list
        await redisClient.rPush('events', JSON.stringify(event));

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Event stored successfully.',
            data: event,
        });
    } catch (err) {
        console.error('Error storing event:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to store event.',
            data: null,
        });
    }
});

// Fetch single user profile
app.get('/api/user-profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const profile = await redisQueries.getUserProfile(userId);
        res.json(profile);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Fetch multiple user profiles
app.post('/api/user-profiles', async (req, res) => {
    try {
        const userIds = req.body.userIds;
        const profiles = await redisQueries.getUserProfiles(userIds);
        res.json(profiles);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Fetch recommendations for a user
app.get('/api/recommendations/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const recommendations = await recommendationService.getRecommendations(userId);
        res.json(recommendations);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Example: Get configuration from ZooKeeper
app.get('/api/config/:path', async (req, res) => {
    try {
        const config = await zkClient.getConfig(req.params.path);
        res.json({ path, config });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Example: Set configuration in ZooKeeper
app.post('/api/config/:path', async (req, res) => {
    try {
        await zkClient.setConfig(req.params.path, JSON.stringify(req.body));
        res.json({ success: true });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});


// Get current weights
app.get('/api/recommendation/weights', async (req, res) => {
    try {
        const weightsData = await zkClient.getConfig('/config/recommendation/weights');

        // 解析数据（兼容字符串和对象）
        const parsedWeights = typeof weightsData === 'string' ?
            JSON.parse(weightsData) :
            weightsData;

        // 宽松验证（允许数值为0）
        if (
            parsedWeights.view === undefined ||
            parsedWeights.add_to_cart === undefined ||
            parsedWeights.purchase === undefined
        ) {
            throw new Error('Missing required weight fields');
        }

        // 强制转换为数字类型
        const validatedWeights = {
            view: Number(parsedWeights.view),
            add_to_cart: Number(parsedWeights.add_to_cart),
            purchase: Number(parsedWeights.purchase)
        };

        res.json(validatedWeights);
    } catch (err) {
        console.error('ZK weights fetch error:', err);

        // 返回安全的默认值
        const defaultWeights = { view: 1, add_to_cart: 3, purchase: 5 };
        res.json(defaultWeights);
    }
});

// Update recommendation weights
app.post('/api/recommendation/weights', async (req, res) => {
    try {
        const { view, add_to_cart, purchase } = req.body;

        if (typeof view !== 'number' ||
            typeof add_to_cart !== 'number' ||
            typeof purchase !== 'number') {
            return res.status(400).json({
                error: "Invalid input",
                details: "All weights must be numbers"
            });
        }

        const weights = { view, add_to_cart, purchase };
        const weightsString = JSON.stringify(weights);

        await zkClient.setConfig('/config/recommendation/weights', weightsString);

        res.json(weights);
    } catch (err) {
        console.error('Weight update error:', err);
        res.status(500).json({
            error: "Failed to update weights",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});



// your own counters/gauges/histograms, e.g.:
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
});

app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on('finish', () => {
        end({ status_code: res.statusCode });
    });
    next();
});

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', client.register.contentType);
        const metrics = await client.register.metrics();
        res.end(metrics);
    } catch (err) {
        res.status(500).end(err.message);
    }
});

// Start the server
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    // Clear old data from Redis
    await clearOldData();
});

