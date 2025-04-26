import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Paper } from '@mui/material';

const WeightConfigPage = () => {
    const [weights, setWeights] = useState({
        view: 1,
        add_to_cart: 3,
        purchase: 5
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [error, setError] = useState(null);

    const fetchWeights = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/recommendation/weights');
            const data = await response.json();

            // 安全设置状态（处理可能的NaN）
            setWeights({
                view: isNaN(data.view) ? 1 : data.view,
                add_to_cart: isNaN(data.add_to_cart) ? 3 : data.add_to_cart,
                purchase: isNaN(data.purchase) ? 5 : data.purchase
            });
        } catch (error) {
            console.error('Using default weights due to error:', error);
            setWeights({ view: 1, add_to_cart: 3, purchase: 5 });
        }
    };
    // Fetch current weights
    useEffect(() => {
        fetchWeights();
    }, []);

    // Update weights
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError(null); // 清空之前的错误

        try {
            // 1. 显式转换数值类型（防止字符串格式）
            const payload = {
                view: Number(weights.view),
                add_to_cart: Number(weights.add_to_cart),
                purchase: Number(weights.purchase)
            };

            // 2. 添加完整的请求URL（避免路径问题）
            const response = await fetch('http://localhost:3000/api/recommendation/weights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 3. 统一处理响应（无论成功/失败都尝试解析JSON）
            const responseText = await response.text();
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch {
                throw new Error(`Invalid JSON response: ${responseText}`);
            }

            // 4. 根据状态码处理结果
            if (!response.ok) {
                throw new Error(responseData.error || `Server error: ${response.status}`);
            }

            // 5. 更新成功后的操作
            setMessage('Weights updated successfully!');
            setWeights(responseData); // 直接使用后端返回的最新值
            setError(null);
        } catch (error) {
            console.error('Update error:', error);
            setMessage('Failed to update weights: ' + error.message);
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setWeights(prev => ({
            ...prev,
            [name]: Number(value)
        }));
    };

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', my: 4 }}>
            <Typography variant="h5" gutterBottom>
                Recommendation Algorithm Weights Configuration
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField
                    fullWidth
                    margin="normal"
                    label="View Weight"
                    name="view"
                    type="number"
                    value={weights.view}
                    onChange={handleChange}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    label="Add to Cart Weight"
                    name="add_to_cart"
                    type="number"
                    value={weights.add_to_cart}
                    onChange={handleChange}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    label="Purchase Weight"
                    name="purchase"
                    type="number"
                    value={weights.purchase}
                    onChange={handleChange}
                />

                <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ mt: 3 }}
                >
                    {loading ? 'Updating...' : 'Update Weights'}
                </Button>

                {message && (
                    <Typography color={message.includes('successfully') ? 'success.main' : 'error.main'} sx={{ mt: 2 }}>
                        {message}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

export default WeightConfigPage;