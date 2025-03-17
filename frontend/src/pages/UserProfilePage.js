import React, { useState } from 'react';
import { getUserProfile } from '../api';

const UserProfilePage = () => {
    const [userId, setUserId] = useState('');
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');

    const handleFetchProfile = async () => {
        try {
            const data = await getUserProfile(userId);
            setProfile(data);
            setError('');
        } catch (err) {
            setError(err.message); // Display error message on the page
            setProfile(null);
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

            {/* Display error message */}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {/* Display profile data */}
            {profile && (
                <div>
                    <p>User ID: {profile.userId}</p>
                    <p>View Count: {profile.viewCount}</p>
                    <p>Add to Cart Count: {profile.addToCartCount}</p>
                    <p>Purchase Count: {profile.purchaseCount}</p>
                    <p>Last Activity Time: {new Date(profile.lastActivityTime).toLocaleString()}</p>
                </div>
            )}
        </div>
    );
};

export default UserProfilePage;