import React, { useEffect, useState } from 'react';

const UserBehaviorMonitoringPage = () => {
    const [events, setEvents] = useState([]);
    const [uvData, setUvData] = useState({});

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/user-behavior');
                const data = await response.json();
                setEvents(prevEvents => {
                    const newEvents = [...data, ...prevEvents];
                    return newEvents.slice(-15); // Keep only the latest 15 events
                });
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        };

        const fetchUvData = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/uv-data');
                const data = await response.json();
                setUvData(data);
            } catch (error) {
                console.error('Error fetching UV data:', error);
            }
        };

        fetchEvents();
        fetchUvData();
        const interval = setInterval(() => {
            fetchEvents();
            fetchUvData();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h1>User Behavior Monitoring</h1>
            <table>
                <thead>
                <tr>
                    <th>Event Type</th>
                    <th>Product</th>
                    <th>User ID</th>
                    <th>Timestamp</th>
                </tr>
                </thead>
                <tbody>
                {events.map((event, index) => (
                    <tr key={index}>
                        <td>{event.eventType}</td>
                        <td>{event.product}</td>
                        <td>{event.userId}</td>
                        <td>{event.timestamp}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            <h2>Real-Time UV Data</h2>
            <table>
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>UV Count</th>
                </tr>
                </thead>
                <tbody>
                {Object.entries(uvData).map(([date, products]) =>
                    Object.entries(products).map(([product, uvCount], index) => (
                        <tr key={`${date}-${product}-${index}`}>
                            <td>{date}</td>
                            <td>{product}</td>
                            <td>{uvCount}</td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
};

export default UserBehaviorMonitoringPage;