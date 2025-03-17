const API_BASE_URL = 'http://localhost:3000/api';

// Fetch single user profile by userId
export const getUserProfile = async (userId) => {
    const response = await fetch(`${API_BASE_URL}/user-profile/${userId}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
    }
    return response.json();
};

// Fetch multiple user profiles by userIds
export const getUserProfiles = async (userIds) => {
    const response = await fetch(`${API_BASE_URL}/user-profiles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
    }
    return response.json();
};