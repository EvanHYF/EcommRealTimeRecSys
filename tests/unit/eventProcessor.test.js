const redis = require('redis');
const { processEvent, handleViewEvent, handleAddToCartEvent, handlePurchaseEvent, trackPageView } = require('../../backend/src/eventProcessor');

jest.mock('redis', () => {
    const mClient = { connect: jest.fn(), set: jest.fn(), quit: jest.fn(), sAdd: jest.fn() };
    return { createClient: jest.fn(() => mClient) };
});

describe('eventProcessor', () => {
    it('should process view event and store in Redis', async () => {
        const mClient = redis.createClient();
        mClient.sAdd.mockImplementation((key, value) => Promise.resolve(1));

        const event = { userId: 'user1', product: 'product1', timestamp: new Date().toISOString() };
        await trackPageView(event);
        expect(mClient.sAdd).toHaveBeenCalledWith(`pageviews:${event.timestamp.split('T')[0]}:${event.product}`, event.userId);
    });

    it('should process add-to-cart event', () => {
        const event = { userId: 'user1', product: 'product1', timestamp: new Date().toISOString() };
        handleAddToCartEvent(event);
        expect(console.log).toHaveBeenCalledWith('Processing add-to-cart event:', event);
    });

    it('should process purchase event', () => {
        const event = { userId: 'user1', product: 'product1', timestamp: new Date().toISOString() };
        handlePurchaseEvent(event);
        expect(console.log).toHaveBeenCalledWith('Processing purchase event:', event);
    });
});