package com.ecommrealtimerecsys;

import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer;

import java.util.Properties;

public class SimpleFlinkJob {
    public static void main(String[] args) throws Exception {
        // 设置执行环境
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // 配置 Kafka 消费者
        Properties consumerProperties = new Properties();
        consumerProperties.setProperty("bootstrap.servers", "localhost:9092");
        consumerProperties.setProperty("group.id", "flink-consumer");
        FlinkKafkaConsumer<String> consumer = new FlinkKafkaConsumer<>("input-topic", new SimpleStringSchema(), consumerProperties);

        // 从 Kafka 读取数据
        DataStream<String> input = env.addSource(consumer);

        // 简单处理：将输入字符串转换为大写
        DataStream<String> processed = input.map(String::toUpperCase);

        // 配置 Kafka 生产者
        Properties producerProperties = new Properties();
        producerProperties.setProperty("bootstrap.servers", "localhost:9092");
        FlinkKafkaProducer<String> producer = new FlinkKafkaProducer<>("output-topic", new SimpleStringSchema(), producerProperties);

        // 将处理后的数据写回 Kafka
        processed.addSink(producer);

        // 执行作业
        env.execute("Simple Flink Job");
    }
}