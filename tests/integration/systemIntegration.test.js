const kafka = require('kafka-node');
const redis = require('redis');
const { simulateEvent } = require('../../backend/src/ecommerceSimulator');
const { processEvent } = require('../../backend/src/eventProcessor');

jest.mock('redis', () => {
    const mClient = { connect: jest.fn(), set: jest.fn(), get: jest.fn(), quit: jest.fn(), sAdd: jest.fn() };
    return { createClient: jest.fn(() => mClient) };
});

describe('System Integration', () => {
    let mProducer;
    let mConsumer;

    beforeAll(() => {
        const mClient = new kafka.KafkaClient();
        mProducer = new kafka.Producer(mClient);
        mConsumer = new kafka.Consumer(
            mClient,
            [
                { topic: 'view-events', partition: 0 },
                { topic: 'add-to-cart-events', partition: 0 },
                { topic: 'purchase-events', partition: 0 }
            ],
            { autoCommit: true }
        );
    });

    it('should integrate ecommerceSimulator and eventProcessor', async () => {
        const mRedisClient = redis.createClient();
        mProducer.send.mockImplementation((payloads, cb) => cb(null, 'success'));
        mConsumer.on.mockImplementation((event, cb) => {
            if (event === 'message') {
                cb({ topic: 'view-events', value: JSON.stringify({ eventType: 'view', product: 'product1', userId: 'user1', timestamp: new Date().toISOString() }) });
            }
        });
        mRedisClient.sAdd.mockImplementation((key, value) => Promise.resolve(1));

        const event = { eventType: 'view', product: 'product1', userId: 'user1', timestamp: new Date().toISOString() };
        await simulateEvent(event);
        await processEvent(event);

        const cachedMessage = await new Promise((resolve, reject) => {
            mRedisClient.get('event-key', (err, reply) => {
                if (err) reject(err);
                resolve(reply);
            });
        });

        expect(cachedMessage).toBe('Hello Kafka');
    });
});