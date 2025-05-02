high-level component overview

flowchart LR
    subgraph Users & Ingestion
        EndUser["End User"] --> Browser["React Frontend"]
        Browser --> API["Express API"]
        EcomSim["E-com Simulator"] --> Kafka["Kafka Cluster"]
        API --> Kafka
end

subgraph Processing & Storage
    Kafka --> Cons["ConsumerWorker\n(one per partition)"]
    Cons --> RedisUV["Redis: UV Sets (`SADD pageviews:…`)"]
    Cons --> API
    Kafka --> Flink["Flink Job"]
    Flink --> RedisTags["Redis: Interest Tags (`user:interest:<id>`)"]
    API --> RedisEvents["Redis: Events (list)"]
    API --> RedisProfiles["Redis: User Profiles (hash)"]
end

subgraph Monitoring & Visuals
    API --> Prometheus["Prometheus"]
    RedisExporter["Redis Exporter"] --> Prometheus
    KafkaExporter["Kafka Exporter"] --> Prometheus
    Prometheus --> Grafana["Grafana Dashboard"]
end

detailed sequence for a “view” event

sequenceDiagram
    participant Sim as E-com Simulator
    participant K as Kafka
    participant C as ConsumerWorker
    participant API as Express API
    participant R as Redis
    participant F as Flink
    participant P as Prometheus
    
    Sim->>K: publish view-event JSON
    K->>C: deliver message to partition
    C->>R: SADD pageviews:<date>:<product>
    C->>API: POST /api/user-behavior
    API->>R: RPUSH events list
    K->>F: stream event for tag computation
    F->>R: HSET user:interest:<id>
    API->>P: expose /metrics
    P->>Grafana: scrape and visualize
