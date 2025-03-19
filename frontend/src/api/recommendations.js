const API_BASE_URL = 'http://localhost:3000/api';

// Fetch recommendations for a user
export const getRecommendations = async (userId) => {
    const response = await fetch(`${API_BASE_URL}/recommendations/${userId}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
    }
    return response.json();
};