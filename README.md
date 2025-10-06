<div align="center">
  <br />
  <!-- You can create a logo for IdeaSphere and save it as assets/logo.png -->
  <img src="https://raw.githubusercontent.com/YuvaKrishnaS/ideasphere-backend/main/assets/logo.png" alt="IdeaSphere Logo">
  <h1 align="center">IdeaSphere Backend API</h1>
  <p align="center">
    The complete backend for India's first student-only social media platform, built with Node.js, Express, and PostgreSQL.
    <br />
    <a href="https://github.com/YuvaKrishnaS/ideasphere-backend/issues">Report Bug</a>
    ·
    <a href="https://github.com/YuvaKrishnaS/ideasphere-backend/issues">Request Feature</a>
  </p>
</div>

<div align="center">

[![CI/CD Status](https://github.com/YuvaKrishnaS/ideasphere-backend/actions/workflows/node.js.yml/badge.svg)](https://github.com/YuvaKrishnaS/ideasphere-backend/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/github/license/YuvaKrishnaS/ideasphere-backend?style=flat-square)](https://github.com/YuvaKrishnaS/ideasphere-backend/blob/main/LICENSE)
[![Contributors](https://img.shields.io/github/contributors/YuvaKrishnaS/ideasphere-backend?style=flat-square)](https://github.com/YuvaKrishnaS/ideasphere-backend/graphs/contributors)
[![GitHub stars](https://img.shields.io/github/stars/YuvaKrishnaS/ideasphere-backend?style=social)](https://github.com/YuvaKrishnaS/ideasphere-backend/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/YuvaKrishnaS/ideasphere-backend?style=social)](https://github.com/YuvaKrishnaS/ideasphere-backend/network/members)

</div>

---

## 🚀 Live Demo & Status

The backend is currently deployed and live on Railway. You can check its operational status in real-time.

[![Live API Status](https://img.shields.io/website?url=https%3A%2F%2Fideasphere-backend-production-d4bb.up.railway.app%2Fhealth&up_message=online&down_message=offline&label=API%20Status&style=for-the-badge)](https://ideasphere-backend-production-d4bb.up.railway.app/health)

-   **API Base URL**: `https://ideasphere-backend-production-d4bb.up.railway.app/api`
-   **Health Check**: `https://ideasphere-backend-production-d4bb.up.railway.app/health`

---

## 📋 Table of Contents

-   [About The Project](#about-the-project)
-   [Key Features](#key-features)
-   [Architecture](#architecture)
-   [Tech Stack](#tech-stack)
-   [Getting Started](#getting-started)
-   [API Endpoints](#api-endpoints)
-   [Contributing](#contributing)
-   [License](#license)
-   [Contact](#contact)

---

## 🌟 About The Project

IdeaSphere is a feature-rich backend API designed to power a modern social media application exclusively for students. It includes everything from user authentication and content management to real-time chat, AI-powered recommendations, and a complete file storage system.

This repository serves as the complete, open-source foundation for the IdeaSphere mobile and web applications.

---

## ✨ Key Features

-   🔐 **User Authentication**: Secure JWT-based registration, login, and session management.
-   📝 **Content Management**: Create, read, update, and delete "Bits" (short posts) and "Stacks" (tutorial series).
-   🤝 **Social Features**: A complete following system, content liking, bookmarking, and commenting.
-   🤖 **AI-Powered Recommendations**: A smart algorithm to generate a personalized content feed for each user.
-   ☁️ **S3-Compatible File Storage**: Robust file upload system using Filebase for decentralized storage (profile pictures, post images, etc.).
-   📡 **Real-Time Chat & Collaboration**: Built with Socket.IO for the "Build Together Studio" feature.
-   🏆 **Reputation & Gamification**: A scoring system to track user contributions and award badges.
-   🛡️ **Moderation & Reporting**: Tools for users to report content and for admins to review and take action.

---

## 🏗️ Architecture

Below is a high-level overview of the backend architecture. The system is designed to be scalable and modular, with clear separation of concerns.

<!-- Create a simple architecture diagram and save it as assets/architecture.png -->
![Architecture Diagram](https://raw.githubusercontent.com/YuvaKrishnaS/ideasphere-backend/main/assets/architecture.png)

---

## 🛠️ Tech Stack

This project is built with a modern, robust, and scalable technology stack.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Filebase](https://img.shields.io/badge/Filebase-233876?style=for-the-badge&logo=filebase&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D12?style=for-the-badge&logo=railway&logoColor=white)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18.x or later)
-   npm or yarn
-   A running PostgreSQL instance
-   A free [Filebase](https://filebase.com) account

### Installation

1.  **Clone the repository:**
    ```
    git clone https://github.com/YuvaKrishnaS/ideasphere-backend.git
    cd ideasphere-backend
    ```
2.  **Install NPM packages:**
    ```
    npm install
    ```
3.  **Set up your environment variables:**
    Create a `.env` file in the root directory and add your configuration. You can use the `.env.example` file as a template.
    ```
    # Server
    PORT=3000
    NODE_ENV=development
    JWT_SECRET=your_super_secret_jwt_key
    FRONTEND_URL=http://localhost:3000

    # Database (PostgreSQL)
    DATABASE_URL=postgresql://user:password@host:port/database

    # Filebase S3 Storage
    R2_ACCESS_KEY_ID=your_filebase_access_key
    R2_SECRET_ACCESS_KEY=your_filebase_secret_key
    R2_BUCKET_NAME=your_filebase_bucket_name
    R2_ENDPOINT=https://s3.filebase.com
    ```
4.  **Run the development server:**
    ```
    npm run dev
    ```
    The server will start on `http://localhost:3000`.

---

## 🗺️ API Endpoints

The API is structured logically around features. Here are some of the primary endpoints:

| Method | Endpoint                    | Description                      |
| :----- | :-------------------------- | :------------------------------- |
| `POST` | `/api/auth/register`        | Register a new user              |
| `POST` | `/api/auth/login`           | Log in and receive a JWT         |
| `GET`  | `/api/bits`                 | Get the main feed of Bits        |
| `POST` | `/api/bits`                 | Create a new Bit                 |
| `POST` | `/api/upload/profile-image` | Upload a user's profile picture  |
| `POST` | `/api/follow/:userId`       | Follow another user              |
| `GET`  | `/api/ai/feed`              | Get a personalized, AI-driven feed |
| `GET`  | `/health`                   | Check the server's health status |

For a complete list of endpoints, please refer to the `routes/` directory.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see the [CONTRIBUTING.md](https://github.com/YuvaKrishnaS/ideasphere-backend/blob/main/CONTRIBUTING.md) file for our contribution guidelines.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📧 Contact

Your Name - [@krishna.corei7](https://twitter.com/krishna.corei7) - krishnathecodernaveen@gmail.com

Project Link: [https://github.com/YuvaKrishnaS/ideasphere-backend](https://github.com/YuvaKrishnaS/ideasphere-backend)
