// backend/src/redisPreloader.js
require('dotenv').config();
const redis = require('redis');
const cron = require('node-cron');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6479';
const HOT_HASH   = 'hot:pageview_counts';

async function preloadHotData() {
    const client = redis.createClient({ url: REDIS_URL });
    client.on('error', err => console.error('Redis error:', err));
    await client.connect();

    try {
        // 1. Determine today’s date key prefix
        const date = new Date().toISOString().slice(0, 10);
        // 2. Find all pageview sets for today
        const keys = await client.keys(`pageviews:${date}:*`);
        // 3. For each product, get the unique‐visitor count
        const pipeline = client.multi();
        keys.forEach(key => pipeline.sCard(key));
        const counts = await pipeline.exec();

        // 4. Store counts in a hash for quick lookup
        const hsetArgs = [];
        keys.forEach((key, i) => {
            // strip prefix so field is just the product name
            const product = key.split(':')[2];
            hsetArgs.push(product, counts[i]);
        });
        if (hsetArgs.length) {
            await client.hSet(HOT_HASH, hsetArgs);
            console.log(`Preloaded ${hsetArgs.length/2} hot entries into ${HOT_HASH}`);
        } else {
            console.log('No keys to preload for today');
        }
    } finally {
        await client.quit();
    }
}

// Schedule preload every 5 minutes
cron.schedule('*/5 * * * *', () => {
    console.log(new Date().toISOString(), 'Starting Redis hot-data preload');
    preloadHotData().catch(console.error);
});

// Run immediately once on startup
preloadHotData().catch(console.error);
