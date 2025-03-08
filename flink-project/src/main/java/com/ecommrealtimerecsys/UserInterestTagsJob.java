package com.ecommrealtimerecsys;

import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer;

import java.util.Properties;

public class UserInterestTagsJob {
    public static void main(String[] args) throws Exception {
        // Set up the execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Configure Kafka consumer
        Properties consumerProperties = new Properties();
        consumerProperties.setProperty("bootstrap.servers", "localhost:9092");
        consumerProperties.setProperty("group.id", "user-behavior-group");
        FlinkKafkaConsumer<String> consumer = new FlinkKafkaConsumer<>("user-behavior-topic", new SimpleStringSchema(), consumerProperties);

        // Read data from Kafka
        DataStream<String> userBehaviorStream = env.addSource(consumer);

        // Process the data to compute user interest tags
        DataStream<String> processedStream = userBehaviorStream
                .map(value -> {
                    // Example user behavior data: "userId,behaviorType"
                    String[] parts = value.split(",");
                    String userId = parts[0];
                    String behaviorType = parts[1];

                    // Compute interest tag based on behavior type
                    String interestTag;
                    switch (behaviorType) {
                        case "click":
                            interestTag = "interested";
                            break;
                        case "purchase":
                            interestTag = "highly_interested";
                            break;
                        case "view":
                        default:
                            interestTag = "neutral";
                            break;
                    }

                    // Return the userId and the computed interest tag
                    return userId + "," + interestTag;
                });

        // Configure Kafka producer
        Properties producerProperties = new Properties();
        producerProperties.setProperty("bootstrap.servers", "localhost:9092");
        FlinkKafkaProducer<String> producer = new FlinkKafkaProducer<>("user-interest-tags-topic", new SimpleStringSchema(), producerProperties);

        // Write the result to Kafka
        processedStream.addSink(producer);

        // Execute the Flink job
        env.execute("User Interest Tags Job");
    }
}