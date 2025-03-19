const redis = require('redis');

// Redis client configuration
const redisClient = redis.createClient({
    url: 'redis://localhost:6479' // Ensure the port is correct
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Fetch single user profile
async function getUserProfile(userId) {
    try {
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