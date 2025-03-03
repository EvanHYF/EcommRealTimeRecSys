const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9093,localhost:9094,localhost:9095' });
const producer = new kafka.Producer(client);
const consumer = new kafka.Consumer(
    client,
    [{ topic: 'view-events', partition: 0 }],
    { autoCommit: true }
);

const payloads = [
    { topic: 'view-events', messages: 'Hello Kafka', partition: 0 }
];

producer.on('ready', () => {
    producer.send(payloads, (err, data) => {
        if (err) {
            console.error('Error sending message:', err);
        } else {
            console.log('Message sent:', data);
        }
    });
});

producer.on('error', (err) => {
    console.error('Producer error:', err);
});

consumer.on('message', (message) => {
    console.log('Received message:', message);
});

consumer.on('error', (err) => {
    console.error('Consumer error:', err);
});