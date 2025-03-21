const redis = require('redis');
const { getConfig } = require('./zookeeperClient'); // Import ZooKeeper client

let redisClient;

// Initialize Redis client
async function initRedisClient() {
    try {
        const redisUrl = await getConfig('/config/redis/url'); // Get Redis URL from ZooKeeper

        redisClient = redis.createClient({
            url: redisUrl // Use the URL from ZooKeeper
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
        await redisClient.connect();
    } catch (err) {
        console.error('Error initializing Redis client:', err);
        throw new Error(`Failed to initialize Redis client: ${err.message}`);
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
            throw new Error(`User interest with ID ${userId} does not exist in Redis.`);
        }

        // 确保 value 是 JSON 格式
        try {
            return JSON.parse(value);
        } catch (err) {
            console.error('Invalid JSON format in Redis:', value);
            throw new Error('Stored value is not valid JSON.');
        }
    } catch (err) {
        console.error('Error fetching user interest:', err);
        throw new Error(`Failed to fetch user interest: ${err.message}`);
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