const redis = require('redis');
const zkClient = require('./zookeeperClient'); // Import ZooKeeper client

let redisClient;
const DEFAULT_REDIS_URL = 'redis://localhost:6479';

// Initialize Redis client
async function initRedisClient() {
    try {
        // Make sure ZK client is ready
        await zkClient.ensureReady();

        let redisUrl;
        try {
            const urlData = await zkClient.getConfig('/config/redis/url');
            redisUrl = urlData.toString();
        } catch (err) {
            console.warn('Using default Redis URL:', err.message);
            redisUrl = DEFAULT_REDIS_URL;
        }

        redisClient = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
            }
        });

        redisClient.on('error', (err) => console.error('Redis error:', err));
        redisClient.on('connect', () => console.log('Redis connected'));
        redisClient.on('reconnecting', () => console.log('Redis reconnecting'));

        await redisClient.connect();
    } catch (err) {
        console.error('Redis init failed:', err);
        throw err;
    }
}

// Ensure Redis client is initialized before using it
async function ensureRedisClient() {
    if (!redisClient) {
        await initRedisClient();
    }
}

// Fetch single user profile
async function getUserProfile(userId) {
    try {
        await ensureRedisClient(); // Ensure Redis client is initialized

        const key = 'user-profiles'; // Redis key is 'user-profiles'
        const value = await redisClient.hGet(key, userId); // Use hGet to get the value for the specific field (userId)

        if (!value) {
            throw new Error(`User profile with ID ${userId} does not exist in Redis.`);
        }

        return JSON.parse(value); // Parse the JSON string to an object
    } catch (err) {
        console.error('Error fetching user profile:', err);
        throw new Error(`Failed to fetch user profile: ${err.message}`);
    }
}

// Fetch user interest (recommendations)
async function getUserInterest(userId) {
    try {
        await ensureRedisClient(); // Ensure Redis client is initialized

        const key = 'UserInterestTag';
        const value = await redisClient.hGet(key, userId);

        if (!value) {
            // CHANGED: return empty object instead of throwing
            console.warn(`No user interest for ID ${userId}, returning empty.`);
            return {};
        }

        try {
            return JSON.parse(value);
        } catch (err) {
            console.error('Invalid JSON format in Redis:', value);
            // CHANGED: fallback to empty object rather than erroring out
            return {};
        }
    } catch (err) {
        console.error('Error fetching user interest:', err);
        // CHANGED: swallow errors and return empty object
        return {};
    }
}

// Fetch multiple user profiles
async function getUserProfiles(userIds) {
    try {
        await ensureRedisClient(); // Ensure Redis client is initialized

        const profiles = {};
        const key = 'user-profiles'; // Redis key is 'user-profiles'

        for (const userId of userIds) {
            const value = await redisClient.hGet(key, userId); // Use hGet to get the value for the specific field (userId)

            if (!value) {
                console.warn(`User profile with ID ${userId} does not exist in Redis.`);
                continue; // Skip this user and continue with the next one
            }

            profiles[userId] = JSON.parse(value); // Parse the JSON string to an object
        }

        if (Object.keys(profiles).length === 0) {
            throw new Error('No user profiles found for the provided IDs.');
        }

        return profiles;
    } catch (err) {
        console.error('Error fetching user profiles:', err);
        throw new Error(`Failed to fetch user profiles: ${err.message}`);
    }
}

module.exports = {
    getUserProfile,
    getUserInterest, // Export the new method
    getUserProfiles
};