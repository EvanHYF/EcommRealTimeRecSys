package com.ecommrealtimerecsys;

import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer;
import org.apache.flink.streaming.connectors.redis.RedisSink;
import org.apache.flink.streaming.connectors.redis.common.config.FlinkJedisPoolConfig;
import org.apache.flink.streaming.connectors.redis.common.mapper.RedisCommand;
import org.apache.flink.streaming.connectors.redis.common.mapper.RedisCommandDescription;
import org.apache.flink.streaming.connectors.redis.common.mapper.RedisMapper;
import org.apache.zookeeper.ZooKeeper;
import org.apache.zookeeper.Watcher.Event;
import org.apache.zookeeper.data.Stat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Flink job to process user behavior events and generate user profiles.
 * The results are stored in Redis for user profile storage.
 */
public class UserInterestTagsJob {
    // Static weights config
    private static Map<String, Integer> behaviorWeights = new HashMap<>();
    static {
        behaviorWeights.put("view", 1);
        behaviorWeights.put("add_to_cart", 3);
        behaviorWeights.put("purchase", 5);
    }

    // ZooKeeper monitoring thread
    private static void setupZKWatcher() {
        new Thread(() -> {
            try {
                ZooKeeper zk = new ZooKeeper("zookeeper:2181", 3000, null);
                watchWeightsConfig(zk);
            } catch (Exception e) {
                System.err.println("ZK connect failed，use default recommendation weights");
                e.printStackTrace();
            }
        }).start();
    }

    private static void watchWeightsConfig(ZooKeeper zk) throws Exception {
        Stat stat = zk.exists("/config/recommendation/weights", watchedEvent -> {
            if (watchedEvent.getType() == Event.EventType.NodeDataChanged) {
                try {
                    updateWeights(zk);
                } catch (Exception e) {
                    System.err.println("Weights update failed");
                    e.printStackTrace();
                }
            }
        });
        if (stat != null) updateWeights(zk);
    }

    private static void updateWeights(ZooKeeper zk) throws Exception {
        byte[] data = zk.getData("/config/recommendation/weights", false, null);
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Integer> newWeights = mapper.readValue(
                new String(data),
                new com.fasterxml.jackson.core.type.TypeReference<Map<String, Integer>>(){}
        );

        synchronized (behaviorWeights) {
            behaviorWeights.clear();
            behaviorWeights.putAll(newWeights);
            System.out.println("Weights have updated: " + behaviorWeights);
        }
    }

    public static void main(String[] args) throws Exception {
        // Start ZK listening
        setupZKWatcher();

        // Set up the execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Configure Kafka consumer
        Properties consumerProperties = new Properties();
        consumerProperties.setProperty("bootstrap.servers", "ecommrealtimerecsys-kafka1-1:9092,ecommrealtimerecsys-kafka2-1:9092,ecommrealtimerecsys-kafka3-1:9092");
        consumerProperties.setProperty("group.id", "flink-user-interest-group");
        consumerProperties.setProperty("auto.offset.reset", "latest");
        consumerProperties.setProperty("enable.auto.commit", "false");

        // Define the list of Kafka topics to subscribe to
        List<String> topics = Arrays.asList("view-events", "add-to-cart-events", "purchase-events");

        // Create Kafka consumer for user behavior events
        FlinkKafkaConsumer<String> consumer = new FlinkKafkaConsumer<>(
                topics, // Subscribe to multiple topics
                new SimpleStringSchema(),
                consumerProperties
        );
        consumer.setStartFromLatest();

        // Read data from Kafka
        DataStream<String> userBehaviorStream = env.addSource(consumer);

        // Log the raw data from Kafka
        userBehaviorStream.print("Raw Data");

        // Parse JSON data and compute user profiles
        DataStream<UserProfile> userProfileStream = userBehaviorStream
                .map(new MapFunction<String, UserProfile>() {
                    private final ObjectMapper objectMapper = new ObjectMapper();

                    @Override
                    public UserProfile map(String value) throws Exception {
                        // Parse JSON string
                        ObjectNode jsonNode = (ObjectNode) objectMapper.readTree(value);

                        // Extract fields from JSON
                        String userId = jsonNode.get("userId").asText();
                        String eventType = jsonNode.get("eventType").asText();
                        long timestamp = jsonNode.get("timestamp").asLong();

                        // Create or update user profile
                        UserProfile profile = new UserProfile();
                        profile.setUserId(userId);
                        profile.setLastActivityTime(timestamp);

                        // Update behavior counts based on event type
                        switch (eventType) {
                            case "view":
                                profile.setViewCount(1);
                                break;
                            case "add_to_cart":
                                profile.setAddToCartCount(1);
                                break;
                            case "purchase":
                                profile.setPurchaseCount(1);
                                break;
                        }

                        return profile;
                    }
                })
                .keyBy(UserProfile::getUserId)  // Group by user ID
                .reduce((profile1, profile2) -> {  // Aggregate user behavior
                    profile1.setViewCount(profile1.getViewCount() + profile2.getViewCount());
                    profile1.setAddToCartCount(profile1.getAddToCartCount() + profile2.getAddToCartCount());
                    profile1.setPurchaseCount(profile1.getPurchaseCount() + profile2.getPurchaseCount());
                    profile1.setLastActivityTime(Math.max(profile1.getLastActivityTime(), profile2.getLastActivityTime()));
                    return profile1;
                });

        // Log the processed user profiles
        userProfileStream.print("User Profiles");

        // Configure Kafka producer
        Properties producerProperties = new Properties();
        producerProperties.setProperty("bootstrap.servers", "ecommrealtimerecsys-kafka1-1:9092,ecommrealtimerecsys-kafka2-1:9092,ecommrealtimerecsys-kafka3-1:9092");

        // Create Kafka producer for user profiles
        FlinkKafkaProducer<String> producer = new FlinkKafkaProducer<>(
                "user-profiles-topic", // Output topic
                new SimpleStringSchema(),
                producerProperties
        );

        // Convert UserProfile to JSON string and write to Kafka
        userProfileStream
                .map(UserProfile::toJsonString)
                .addSink(producer);

        // Configure Redis Sink
        FlinkJedisPoolConfig redisConfig = new FlinkJedisPoolConfig.Builder()
                .setHost("redis")  // Redis server address
                .setPort(6379)    // Redis server port
                .build();

        // Create Redis Sink for user profiles
        RedisSink<UserProfile> redisSink = new RedisSink<>(redisConfig, new RedisUserProfileMapper());

        // Write user profiles to Redis

        userProfileStream.addSink(redisSink);
        // Configure Redis Sink for user interests
        RedisSink<UserProfile> redisInterestSink = new RedisSink<>(redisConfig, new RedisUserInterestMapper());

        // Write user interests to Redis
        userProfileStream.addSink(redisInterestSink);

        // Execute the Flink job
        env.execute("User Interest Tags Job");
    }

    /**
     * UserProfile class to store aggregated user behavior data.
     */
    public static class UserProfile {
        private String userId;
        private int viewCount;
        private int addToCartCount;
        private int purchaseCount;
        private long lastActivityTime;

        // Getters and Setters
        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public int getViewCount() {
            return viewCount;
        }

        public void setViewCount(int viewCount) {
            this.viewCount = viewCount;
        }

        public int getAddToCartCount() {
            return addToCartCount;
        }

        public void setAddToCartCount(int addToCartCount) {
            this.addToCartCount = addToCartCount;
        }

        public int getPurchaseCount() {
            return purchaseCount;
        }

        public void setPurchaseCount(int purchaseCount) {
            this.purchaseCount = purchaseCount;
        }

        public long getLastActivityTime() {
            return lastActivityTime;
        }

        public void setLastActivityTime(long lastActivityTime) {
            this.lastActivityTime = lastActivityTime;
        }

        /**
         * Calculate the interest score based on user behavior.
         */
        public int calculateInterestScore() {
            synchronized (behaviorWeights) {
                return viewCount * behaviorWeights.getOrDefault("view", 1)
                        + addToCartCount * behaviorWeights.getOrDefault("add_to_cart", 3)
                        + purchaseCount * behaviorWeights.getOrDefault("purchase", 5);
            }
        }

        /**
         * Generate recommended products based on interest score.
         */
        public List<String> generateRecommendations() {
            int interestScore = calculateInterestScore();
            if (interestScore > 10) {
                return Arrays.asList("product1", "product2", "product3");
            } else if (interestScore > 5) {
                return Arrays.asList("product4", "product5");
            } else {
                return Arrays.asList("product3");
            }
        }

        /**
         * Convert UserProfile to JSON string.
         */

        public String toJsonString() {
            String json = String.format(
                    "{\"userId\":\"%s\",\"viewCount\":%d,\"addToCartCount\":%d,\"purchaseCount\":%d,\"lastActivityTime\":%d}",
                    userId, viewCount, addToCartCount, purchaseCount, lastActivityTime);
            System.out.println("Generated JSON: " + json);
            return json;
        }
    }

    /**
     * Redis Mapper to define how UserProfile data is stored in Redis.
     */
    public static class RedisUserProfileMapper implements RedisMapper<UserProfile> {
        @Override
        public RedisCommandDescription getCommandDescription() {
            // Use HSET to store data in a Redis Hash
            return new RedisCommandDescription(RedisCommand.HSET, "user-profiles");
        }

        @Override
        public String getKeyFromData(UserProfile profile) {
            // Use user ID as the key
            return profile.getUserId();
        }

        @Override
        public String getValueFromData(UserProfile profile) {
            // Store user profile as a JSON string
            return profile.toJsonString();
        }
    }

    public static class RedisUserInterestMapper implements RedisMapper<UserProfile> {
        private static final ObjectMapper objectMapper = new ObjectMapper();  // JSON 序列化工具

        @Override
        public RedisCommandDescription getCommandDescription() {
            return new RedisCommandDescription(RedisCommand.HSET, "UserInterestTag");
        }

        @Override
        public String getKeyFromData(UserProfile profile) {
            return profile.getUserId();
        }

        @Override
        public String getValueFromData(UserProfile profile) {
            try {
                return objectMapper.writeValueAsString(profile.generateRecommendations());
            } catch (Exception e) {
                e.printStackTrace();
                return "[]";
            }
        }
    }
}