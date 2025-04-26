// Spawns/kills consumerWorker processes based on topic partitions in ZooKeeper
require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');
const zkClientModule = require('./zookeeperClient');
const topics = ['view-events','add-to-cart-events','purchase-events'];
const workers = topics.reduce((m, t) => { m[t] = {}; return m; }, {});

async function watchTopic(topic) {
    const zkPath = `/brokers/topics/${topic}/partitions`;
    const client = zkClientModule;

    async function update() {
        const partitions = await new Promise((resolve, reject) => {
            client.client.getChildren(
                zkPath,
                () => update(),
                (err, children) => err ? reject(err) : resolve(children.map(p=>parseInt(p,10)))
            );
        });
        const current = Object.keys(workers[topic]).map(n=>parseInt(n,10));
        // spawn new
        partitions.forEach(p => {
            if (workers[topic][p]) return;
            const worker = fork(path.resolve(__dirname,'consumerWorker.js'), [topic, p]);
            workers[topic][p] = worker;
            console.log(`Spawned consumer for ${topic}[partition=${p}]`);
        });
        // kill removed
        current.forEach(p => {
            if (!partitions.includes(p)) {
                workers[topic][p].kill();
                delete workers[topic][p];
                console.log(`Killed consumer for ${topic}[partition=${p}]`);
            }
        });
    }

    await client.connectionPromise;
    await update();
}

async function init() {
    topics.forEach(topic => watchTopic(topic).catch(err => console.error(`Error watching ${topic}:`, err)));
}

init();
