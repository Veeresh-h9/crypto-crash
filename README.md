# Crypto Crash Game - Full Stack Implementation
## Access the Application - https://crashgame69.netlify.app/

A real-time multiplayer crash game with cryptocurrency integration built with Node.js, Express, MongoDB, and React. Players bet in USD, which gets converted to cryptocurrency using live prices, and try to cash out before the game crashes.

## 🎮 Game Overview

**Crypto Crash** is a provably fair gambling game where:
- Players place bets in USD, converted to cryptocurrency (BTC/ETH) at real-time prices
- A multiplier starts at 1.0x and increases exponentially over time
- The game randomly "crashes" at a predetermined multiplier (1.01x to 100x)
- Players must cash out before the crash to win their bet multiplied by the current multiplier
- All transactions are logged with mock blockchain transaction hashes

## 🏗️ Technical Architecture

### Backend Stack
- **Node.js** with **Express.js** - RESTful API and WebSocket server
- **MongoDB** - NoSQL database for game data, wallets, and transactions
- **Socket.IO** - Real-time WebSocket communication
- **CoinGecko API** - Live cryptocurrency price feeds
- **Crypto Module** - Cryptographically secure random number generation

### Frontend Stack
- **React 18** with **TypeScript** - Modern UI framework
- **Tailwind CSS** - Utility-first styling
- **Socket.IO Client** - Real-time game updates
- **Lucide React** - Icon library

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd crypto-crash-game
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```

### 3. Configure Environment Variables
Edit `server/.env`:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/crypto-crash

# Server Configuration
PORT=3001
NODE_ENV=development

# CoinGecko API Configuration (No API key required)
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Game Configuration
ROUND_DURATION=10000
MIN_CRASH_MULTIPLIER=1.01
MAX_CRASH_MULTIPLIER=100
MULTIPLIER_UPDATE_INTERVAL=100

# Security Configuration
MAX_BET_USD=1000
MIN_BET_USD=1
PRICE_CACHE_DURATION=10000
```

### 4. Frontend Setup
```bash
# In root directory
npm install
```

### 5. Start MongoDB
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

### 6. Start Backend Server
```bash
cd server
npm run dev
```

### 7. Start Frontend Development Server
```bash
# In root directory
npm run dev
```

### 8. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001



## 📄 License

This project is for educational purposes only. Please ensure compliance with gambling regulations in your jurisdiction before deploying to production.

