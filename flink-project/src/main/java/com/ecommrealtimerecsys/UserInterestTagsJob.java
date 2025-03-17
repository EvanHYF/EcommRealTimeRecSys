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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Arrays;
import java.util.List;
import java.util.Properties;

/**
 * Flink job to process user behavior events and generate user profiles.
 * The results are stored in Redis for user profile storage.
 */
public class UserInterestTagsJob {
    public static void main(String[] args) throws Exception {
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
}