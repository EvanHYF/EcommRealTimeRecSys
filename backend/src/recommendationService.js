const { getUserInterest } = require('./redisQueries');

async function getRecommendations(userId) {
    try {
        const recommendations = await getUserInterest(userId);

        if (!Array.isArray(recommendations)) {
            // CHANGED: return empty list when no recommendation IDs
            console.log(`No recommendation IDs for user ${userId}; returning empty list.`);
            return [];
        }

        const recommendationIds = Array.isArray(recommendations) ? recommendations : JSON.parse(recommendations);

        const products = {
            product1: { id: 1, name: 'Product A', category: 'Electronics' },
            product2: { id: 2, name: 'Product B', category: 'Fashion' },
            product3: { id: 3, name: 'Product C', category: 'Home' },
            product4: { id: 4, name: 'Product D', category: 'Electronics' },
            product5: { id: 5, name: 'Product E', category: 'Fashion' },
        };

        // Convert recommendation result data into array
        return recommendations.map(id =>
            products[id] || { id, name: 'Unknown Product', category: 'Unknown' }
        );
    } catch (err) {
        console.error('Error fetching recommendations:', err);
        throw new Error(`Failed to fetch recommendations: ${err.message}`);
    }
}

module.exports = {
    getRecommendations
};