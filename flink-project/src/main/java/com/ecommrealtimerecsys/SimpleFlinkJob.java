package com.ecommrealtimerecsys;

import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.DataStreamSource;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer;

import java.util.Properties;

public class SimpleFlinkJob {
    public static void main(String[] args) throws Exception {
        // 设置执行环境
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // 配置 Kafka 消费者
        Properties properties = new Properties();
        properties.setProperty("bootstrap.servers", "kafka1-1:9093,kafka2-1:9094,kafka3-1:9095");
        properties.setProperty("group.id", "flink-consumer");

        // 创建多个 Kafka 消费者，分别读取不同的主题
        FlinkKafkaConsumer<String> viewEventsConsumer = new FlinkKafkaConsumer<>("view-events", new SimpleStringSchema(), properties);
        FlinkKafkaConsumer<String> addToCartEventsConsumer = new FlinkKafkaConsumer<>("add-to-cart-events", new SimpleStringSchema(), properties);
        FlinkKafkaConsumer<String> purchaseEventsConsumer = new FlinkKafkaConsumer<>("purchase-events", new SimpleStringSchema(), properties);

        // 从 Kafka 读取数据
        DataStreamSource<String> viewEventsStream = env.addSource(viewEventsConsumer);
        DataStreamSource<String> addToCartEventsStream = env.addSource(addToCartEventsConsumer);
        DataStreamSource<String> purchaseEventsStream = env.addSource(purchaseEventsConsumer);

        // 合并多个数据流
        DataStream<String> inputStream = viewEventsStream.union(addToCartEventsStream, purchaseEventsStream);

        // 简单处理：将输入字符串转换为大写
        DataStream<String> processedStream = inputStream.map(String::toUpperCase);

        // 配置 Kafka 生产者
        FlinkKafkaProducer<String> producer = new FlinkKafkaProducer<>("output-topic", new SimpleStringSchema(), properties);

        // 将处理后的数据写回 Kafka
        processedStream.addSink(producer);

        // 执行作业
        env.execute("Simple Flink Job");
    }
}