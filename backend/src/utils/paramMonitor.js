const zkClient = require('../zookeeperClient');
const { REC_PARAMS_PATH } = require('../config/zkConfig');

class ParamMonitor {
    static startHealthCheck() {
        setInterval(async () => {
            try {
                await zkClient.getConfig(REC_PARAMS_PATH);
            } catch (err) {
                console.error('ZK Config Health Check Failed:', err.message);
            }
        }, 30000);
    }
}

module.exports = ParamMonitor;