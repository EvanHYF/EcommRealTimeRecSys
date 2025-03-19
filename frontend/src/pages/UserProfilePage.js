import React, { useState } from 'react';
import { getUserProfile } from '../api/redisQueries';
import { getRecommendations } from '../api/recommendations';

const UserProfilePage = () => {
    const [userId, setUserId] = useState('');
    const [profile, setProfile] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [error, setError] = useState('');

    const handleFetchProfile = async () => {
        try {
            console.log('Fetching profile for user ID:', userId);
            const data = await getUserProfile(userId);
            console.log('Profile data received:', data);
            setProfile(data);
            setError('');
        } catch (err) {
            console.error('Error fetching profile:', err.message);
            setError(err.message);
            setProfile(null);
        }
    };

    const handleFetchRecommendations = async () => {
        try {
            console.log('Fetching recommendations for user ID:', userId);
            const data = await getRecommendations(userId);
            console.log('Recommendations data received:', data);
            setRecommendations(data);
            setError('');
        } catch (err) {
            console.error('Error fetching recommendations:', err.message);
            setError(err.message);
            setRecommendations([]);
        }
    };

    return (
        <div>
            <h2>User Profile</h2>
            <input
                type="text"
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
            />
            <button onClick={handleFetchProfile}>Fetch Profile</button>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {profile && (
                <div>
                    <p>User ID: {profile.userId}</p>
                    <p>View Count: {profile.viewCount}</p>
                    <p>Add to Cart Count: {profile.addToCartCount}</p>
                    <p>Purchase Count: {profile.purchaseCount}</p>
                    <p>Last Activity Time: {new Date(profile.lastActivityTime).toLocaleString()}</p>
                    <button onClick={handleFetchRecommendations}>Get Recommendations</button>
                </div>
            )}

            {recommendations.length > 0 && (
                <div>
                    <h3>Recommendations</h3>
                    <ul>
                        {recommendations.map((recommendation) => (
                            <li key={recommendation.id}>
                                <strong>{recommendation.name}</strong> - {recommendation.category}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UserProfilePage;