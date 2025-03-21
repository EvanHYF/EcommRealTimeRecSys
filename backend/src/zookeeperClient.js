const zookeeper = require('node-zookeeper-client');

const client = zookeeper.createClient('localhost:2181');

client.once('connected', () => {
    console.log('Connected to ZooKeeper.');
});

client.connect();

function getConfig(path) {
    return new Promise((resolve, reject) => {
        client.getData(path, (error, data, stat) => {
            if (error) {
                return reject(error);
            }
            resolve(data.toString('utf8'));
        });
    });
}

function setConfig(path, value) {
    return new Promise((resolve, reject) => {
        client.setData(path, Buffer.from(value), (error, stat) => {
            if (error) {
                return reject(error);
            }
            resolve(stat);
        });
    });
}

module.exports = {
    getConfig,
    setConfig
};