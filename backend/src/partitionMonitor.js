// backend/src/partitionMonitor.js
require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');
const zookeeper = require('node-zookeeper-client');

const ZK_HOST = process.env.ZK_HOST || 'localhost:2181';
const TOPICS = ['view-events','add-to-cart-events','purchase-events','user-interest-tags-topic'];

const zk = zookeeper.createClient(ZK_HOST);
const workers = {}; // key = `${topic}-${partition}`

function spawnWorker(topic, partition) {
    const key = `${topic}-${partition}`;
    if (workers[key]) return;
    console.log(`Spawning consumer for ${topic}[${partition}]`);
    const worker = fork(path.resolve(__dirname, 'consumerWorker.js'), [topic, partition], {
        env: process.env
    });
    workers[key] = worker;
}

function killWorker(topic, partition) {
    const key = `${topic}-${partition}`;
    const worker = workers[key];
    if (!worker) return;
    console.log(`Killing consumer for ${topic}[${partition}]`);
    worker.kill('SIGINT');
    delete workers[key];
}

function watchTopic(topic) {
    const zkPath = `/brokers/topics/${topic}/partitions`;
    function updatePartitions() {
        zk.getChildren(zkPath, updatePartitions, (err, children) => {
            if (err) {
                console.error(`Error fetching partitions for ${topic}:`, err);
                return;
            }
            const latest = new Set(children.map(p => p));
            // spawn new
            for (const p of latest) spawnWorker(topic, p);
            // kill removed
            for (const key of Object.keys(workers)) {
                const [t, part] = key.split('-');
                if (t === topic && !latest.has(part)) {
                    killWorker(t, part);
                }
            }
        });
    }
    // ensure the ZK path exists then start watching
    zk.exists(zkPath, (err, stat) => {
        if (err || !stat) {
            console.error(`ZK path not found: ${zkPath}`);
            return;
        }
        updatePartitions();
    });
}

zk.once('connected', () => {
    console.log('Connected to ZooKeeper');
    TOPICS.forEach(watchTopic);
});
zk.connect();
