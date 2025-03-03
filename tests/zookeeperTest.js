const zookeeper = require('node-zookeeper-client');

const client = zookeeper.createClient('localhost:2181');
const path = '/test-znode';

client.once('connected', () => {
    console.log('Connected to Zookeeper.');

    client.create(path, Buffer.from('Hello Zookeeper'), (err) => {
        if (err) {
            console.error('Create error:', err);
        } else {
            console.log('Znode created.');

            client.getData(path, (err, data) => {
                if (err) {
                    console.error('Get data error:', err);
                } else {
                    console.log('Znode data:', data.toString());
                }
                client.close();
            });
        }
    });
});

client.connect();