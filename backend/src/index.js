const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.connect().catch(console.error);

app.get('/api/user-behavior', async (req, res) => {
    try {
        const events = await redisClient.lRange('events', 0, -1);
        res.json(events.map(event => JSON.parse(event)));
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/api/uv-data', async (req, res) => {
    try {
        const keys = await redisClient.keys('pageviews:*');
        const uvData = {};

        for (const key of keys) {
            const [prefix, date, product] = key.split(':');
            const uvCount = await redisClient.sCard(key);

            if (!uvData[date]) {
                uvData[date] = {};
            }

            uvData[date][product] = uvCount;
        }

        res.json(uvData);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/api/user-behavior', async (req, res) => {
    const event = req.body;
    try {
        await redisClient.rPush('events', JSON.stringify(event));
        res.status(201).send();
    } catch (err) {
        res.status(500).send(err);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});