const zookeeper = require('node-zookeeper-client');

class ZKClient {
    constructor() {
        this.client = zookeeper.createClient(process.env.ZK_HOST || 'localhost:2181');
        this.isConnected = false;
        this.connectionPromise = this.connect(); // Save the connection Promise
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.client.once('connected', () => {
                console.log('Connected to ZooKeeper');
                this.isConnected = true;
                resolve();
            });
            this.client.once('error', reject);
            this.client.connect();
        });
    }

    async ensureReady() {
        if (!this.isConnected) {
            await this.connectionPromise;
        }
    }

    async getConfig(path) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            this.client.getData(path, (error, data) => {
                if (error) return reject(error);

                try {
                    const dataString = data.toString('utf8');
                    JSON.parse(dataString);
                    resolve(dataString);
                } catch (parseError) {
                    reject(new Error(`Invalid JSON data in ZK node: ${parseError.message}`));
                }
            });
        });
    }

    async setConfig(path, value) {
        await this.ensureReady();
        await this.ensurePathExists(path);
        return new Promise((resolve, reject) => {
            this.client.setData(
                path,
                Buffer.from(JSON.stringify(value)),
                -1,
                (error, stat) => {
                    if (error) return reject(error);
                    resolve(stat);
                }
            );
        });
    }

    async ensurePathExists(path) {
        await this.ensureReady();
        const parts = path.split('/').filter(Boolean);
        let currentPath = '';

        for (const part of parts) {
            currentPath += `/${part}`;
            try {
                await new Promise((resolve, reject) => {
                    this.client.exists(currentPath, (err, stat) => {
                        if (err) return reject(err);
                        if (!stat) {
                            this.client.mkdirp(currentPath, (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            } catch (err) {
                if (!err.message.includes('node already exists')) {
                    throw err;
                }
            }
        }
    }

    async initRecommendationWeights() {
        try {
            await this.ensureReady();
            const defaultWeights = {
                view: 1,
                add_to_cart: 3,
                purchase: 5
            };

            await this.ensurePathExists('/config/recommendation');

            // Try to create the node first; if it already exists, update it
            try {
                await new Promise((resolve, reject) => {
                    this.client.create(
                        '/config/recommendation/weights',
                        Buffer.from(JSON.stringify(defaultWeights)),
                        zookeeper.CreateMode.PERSISTENT,
                        (err) => {
                            if (err && err.getCode() !== zookeeper.Exception.NODE_EXISTS) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
                });
            } catch (createErr) {
                console.error('Create node error:', createErr);
            }

            // Ensure the data is up-to-date
            await this.setConfig('/config/recommendation/weights', defaultWeights);
            console.log('Recommendation weights initialized successfully');
        } catch (err) {
            console.error('Failed to initialize recommendation weights:', err);
            throw err;
        }
    }
}

// Singleton pattern (automatically initialized)
const zkClient = new ZKClient();

// Automatically execute initialization
zkClient.connectionPromise
    .then(() => zkClient.initRecommendationWeights())
    .catch(err => console.error('ZK Initialization failed:', err));

module.exports = zkClient;
