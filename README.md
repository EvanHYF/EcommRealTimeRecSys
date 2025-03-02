# EcommRealTimeRecSys (E-commerce Real-time Personalization Recommendation System)

## Project Overview
This project implements a real-time personalization recommendation system for an e-commerce platform, utilizing Kafka, ZooKeeper, Redis, and other technologies to achieve high concurrency and low latency in processing user behavior data and providing recommendation services.

## Tech Stack
- **Frontend**: React.js
- **Backend**: Node.js/Express
- **Database**: Redis
- **Event Stream Processing**: Kafka, Flink
- **Cluster Management**: ZooKeeper
- **Monitoring**: Prometheus, Grafana

## Features
- Real-time user behavior capture and processing
- Real-time updates and storage of user profiles
- Personalized recommendation service
- Dynamic configuration and parameter hot updates
- Real-time monitoring and alerting

## Quick Start

### Environment Setup
1. Clone the project repository:
    ```bash
    git clone https://github.com/your-username/ecommerce-realtime-recommendation.git
    cd ecommerce-realtime-recommendation
    ```

2. Start the Docker environment:
    ```bash
    docker-compose up -d
    ```

### Frontend Setup
1. Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2. Install dependencies and start the frontend:
    ```bash
    npm install
    npm start
    ```

### Backend Setup
1. Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Install dependencies and start the backend:
    ```bash
    npm install
    npm start
    ```

## Documentation
- [Architecture Design](docs/architecture.md)
- [Setup Guide](docs/setup-guide.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

## License
[MIT License](LICENSE)