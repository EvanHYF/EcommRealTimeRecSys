const kafka = require('kafka-node');
const { v4: uuidv4 } = require('uuid');
const { simulateEvent, generateEvent, getRandomElement } = require('../../backend/src/ecommerceSimulator');

jest.mock('kafka-node', () => {
    const mProducer = { send: jest.fn() };
    const mClient = {};
    return {
        KafkaClient: jest.fn(() => mClient),
        Producer: jest.fn(() => mProducer),
    };
});

describe('ecommerceSimulator', () => {
    it('should generate a valid event', () => {
        const event = generateEvent();
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('product');
        expect(event).toHaveProperty('userId');
        expect(event).toHaveProperty('timestamp');
    });

    it('should send event successfully', async () => {
        const mProducer = new kafka.Producer();
        mProducer.send.mockImplementation((payloads, cb) => cb(null, 'success'));

        const event = generateEvent();
        const result = await simulateEvent(event);
        expect(result).toBe('success');
    });

    it('should handle error when sending event', async () => {
        const mProducer = new kafka.Producer();
        mProducer.send.mockImplementation((payloads, cb) => cb('error', null));

        const event = generateEvent();
        await expect(simulateEvent(event)).rejects.toThrow('error');
    });

    it('should get a random element from an array', () => {
        const arr = [1, 2, 3, 4, 5];
        const element = getRandomElement(arr);
        expect(arr).toContain(element);
    });
});