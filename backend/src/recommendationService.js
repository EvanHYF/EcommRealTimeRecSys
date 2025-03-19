const { getUserInterest } = require('./redisQueries');

async function getRecommendations(userId) {
    try {
        const recommendations = await getUserInterest(userId);

        // Return empty array if there is no recommendation data
        if (!recommendations) {
            console.log('No recommendations found for userId:', userId);
            return [];
        }

        // 如果 recommendations 是字符串，解析为数组
        const recommendationIds = Array.isArray(recommendations) ? recommendations : JSON.parse(recommendations);

        // 将商品 ID 转换为前端需要的格式
        const products = {
            product1: { id: 1, name: 'Product A', category: 'Electronics' },
            product2: { id: 2, name: 'Product B', category: 'Fashion' },
            product3: { id: 3, name: 'Product C', category: 'Home' },
            product4: { id: 4, name: 'Product D', category: 'Electronics' },
            product5: { id: 5, name: 'Product E', category: 'Fashion' },
        };

        // Convert recommendation result data into array
        return recommendationIds.map((id) => products[id] || { id, name: 'Unknown Product', category: 'Unknown' });

    } catch (err) {
        console.error('Error fetching recommendations:', err);
        throw new Error(`Failed to fetch recommendations: ${err.message}`);
    }
}

module.exports = {
    getRecommendations
};