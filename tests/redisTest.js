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