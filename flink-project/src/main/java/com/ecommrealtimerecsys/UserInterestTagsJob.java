package com.ecommrealtimerecsys;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer;
import org.apache.flink.streaming.api.functions.sink.PrintSinkFunction;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Arrays;
import java.util.List;
import java.util.Properties;

public class UserInterestTagsJob {
    public static void main(String[] args) throws Exception {
        // Set up the execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Configure Kafka consumer
        Properties consumerProperties = new Properties();
        //consumerProperties.setProperty("bootstrap.servers", "ecommrealtimerecsys-kafka1-1:9093,ecommrealtimerecsys-kafka2-1:9094,ecommrealtimerecsys-kafka3-1:9095");
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
        userBehaviorStream.addSink(new PrintSinkFunction<>());

        // Parse JSON data and compute user interest tags
        DataStream<String> processedStream = userBehaviorStream
                .map(new MapFunction<String, String>() {
                    private final ObjectMapper objectMapper = new ObjectMapper();

                    @Override
                    public String map(String value) throws Exception {
                        // Parse JSON string
                        ObjectNode jsonNode = (ObjectNode) objectMapper.readTree(value);

                        // Extract fields from JSON
                        String userId = jsonNode.get("userId").asText();
                        String eventType = jsonNode.get("eventType").asText();
                        String product = jsonNode.get("product").asText();
                        String timestamp = jsonNode.get("timestamp").asText();

                        // Compute interest tag based on event type
                        String interestTag;
                        switch (eventType) {
                            case "view":
                                interestTag = "interested";
                                break;
                            case "add_to_cart":
                                interestTag = "highly_interested";
                                break;
                            case "purchase":
                                interestTag = "purchased";
                                break;
                            default:
                                interestTag = "neutral";
                                break;
                        }

                        // Log processed data
                        System.out.println("Processed Data: " + userId + "," + interestTag);

                        // Return the processed data as a JSON string
                        return objectMapper.createObjectNode()
                                .put("userId", userId)
                                .put("product", product)
                                .put("eventType", eventType)
                                .put("interestTag", interestTag)
                                .put("timestamp", timestamp)
                                .toString();
                    }
                });

        // Log the processed data
        processedStream.addSink(new PrintSinkFunction<>());

        // Configure Kafka producer
        Properties producerProperties = new Properties();
        //producerProperties.setProperty("bootstrap.servers", "ecommrealtimerecsys-kafka1-1:9093,ecommrealtimerecsys-kafka2-1:9094,ecommrealtimerecsys-kafka3-1:9095");
        producerProperties.setProperty("bootstrap.servers", "ecommrealtimerecsys-kafka1-1:9092,ecommrealtimerecsys-kafka2-1:9092,ecommrealtimerecsys-kafka3-1:9092");

        // Create Kafka producer for user interest tags
        FlinkKafkaProducer<String> producer = new FlinkKafkaProducer<>(
                "user-interest-tags-topic", // Output topic
                new SimpleStringSchema(),
                producerProperties
        );

        // Write the result to Kafka
        processedStream.addSink(producer);

        // Execute the Flink job
        env.execute("User Interest Tags Job");
    }
}