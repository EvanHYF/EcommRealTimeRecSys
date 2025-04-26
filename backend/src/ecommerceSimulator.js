const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9093,localhost:9094,localhost:9095' });
const producer = new kafka.Producer(client);

const topics = [
    { topic: 'view-events' },
    { topic: 'add-to-cart-events' },
    { topic: 'purchase-events' }
];

const eventTypes = ['view', 'add_to_cart', 'purchase'];
const products = ['product1', 'product2', 'product3', 'product4', 'product5'];


const userIds = [
    'user1', 'user2', 'user3', 'user4', 'user5',
    'user6', 'user7', 'user8', 'user9', 'user10'
];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvent() {
    const eventType = getRandomElement(eventTypes);
    const product = getRandomElement(products);
    const userId = getRandomElement(userIds);
    const timestamp = new Date().toISOString();

    return {
        eventType,
        product,
        userId,
        timestamp
    };
}

function sendEvent(event) {
    const payloads = [
        { topic: `${event.eventType}-events`, messages: JSON.stringify(event) }
    ];

    producer.send(payloads, (err, data) => {
        if (err) {
            console.error('Failed to send event:', err);
        } else {
            console.log('Event sent successfully:', data);
        }
    });
}

// 1 event per second
setInterval(() => {
    const event = generateEvent();
    sendEvent(event);
}, 1000);

producer.on('ready', () => {
    console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (err) => {
    console.error('Kafka Producer error:', err);
});