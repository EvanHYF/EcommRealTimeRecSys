# EcommRealTimeRecSys
**E-commerce Real-time Personalization Recommendation System**

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Prerequisites](#prerequisites)
5. [Environment Configuration](#environment-configuration)
6. [Quick Start](#quick-start)
7. [Access Dashboards](#access-dashboards)

---

## Project Overview

EcommRealTimeRecSys captures and processes user behavior (views, add-to-cart, purchases) in real time, computes per-user interest profiles, and serves personalized product recommendations with low latency and high throughput. It also supports dynamic algorithm weight updates and auto-scales Kafka consumers to match partition counts.

## Tech Stack

- **Frontend**: React.js
- **Backend API**: Node.js / Express
- **Event Streaming**: Apache Kafka
- **Stream Processing**: Apache Flink
- **Coordination & Config**: Apache ZooKeeper
- **Cache & Storage**: Redis
- **Monitoring**: Prometheus, Grafana

## Features

- Real-time capture of user events (view / add-to-cart / purchase)
- Real-time Flink job computing per-user interest tags
- Redis storage and query APIs for user profiles
- Personalized recommendation service with hot-reloadable weight parameters
- Automatic scaling of Kafka consumers to match topic partitions
- Live monitoring dashboards for QPS, p95 latency, and error rate

---

## Prerequisites

- Docker & Docker Compose (v2+)
- Node.js (v16+) & npm

---

## Environment Configuration

1. Copy and edit the backend environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. In backend/.env, set environment variables:
   ```bash
   ZK_HOST=localhost:2181
   KAFKA_HOST=localhost:9093,localhost:9094,localhost:9095
   REDIS_URL=redis://localhost:6479
   BACKEND_API=http://localhost:3000/api/user-behavior
   ```
## Quick Start

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/ecommerce-realtime-recommendation.git
   cd ecommerce-realtime-recommendation
   ```
2. **Launch Infrastructure & Monitoring**
   ```bash
   docker-compose up -d
   ```
   This will start:
   - ZooKeeper
   - Kafka brokers
   - Flink JobManager & TaskManager
   - Redis
   - Prometheus & exporters
   - Grafana
3. **Start Backend API**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Or Run index.js and Kafka Consumer Monitor Together 
   ```bash
   npm start:all
   ```
   The Express API will listen on `http://localhost:3000`.
4. **Start Kafka Consumer Monitor**
   ```bash
   npm start:monitor
   ```
   This watches ZooKeeper for partition changes and auto-scales consumer processes.
5. **Run Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Open `http://localhost:3000` in your browser to view the React app.

---
## Endpoints & Dashboards

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3000/api
- **Prometheus**: http://localhost:9090 → Status → Targets
- **Grafana**: http://localhost:3001 (login admin/admin)