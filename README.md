# Crypto Crash Game - Full Stack Implementation

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

## 📡 API Endpoints

### GET /api/prices
Get current cryptocurrency prices from CoinGecko API.

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": {
      "BTC": 65000,
      "ETH": 3500
    },
    "lastUpdate": 1640995200000,
    "supportedCryptos": ["BTC", "ETH"]
  }
}
```

### POST /api/wallet/:playerId
Get or create player wallet with starting balances.

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player_123",
    "balances": {
      "BTC": {
        "amount": 0.01,
        "usdValue": 650
      },
      "ETH": {
        "amount": 1.0,
        "usdValue": 3500
      }
    }
  }
}
```

### POST /api/bet
Place a bet for the current round.

**Request:**
```json
{
  "playerId": "player_123",
  "usdAmount": 10,
  "cryptoType": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roundId": "round_1640995200000",
    "usdAmount": 10,
    "cryptoAmount": 0.00015385,
    "cryptoType": "BTC",
    "priceAtTime": 65000
  }
}
```

### POST /api/cashout
Cash out during an active round.

**Request:**
```json
{
  "playerId": "player_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "multiplier": 2.45,
    "payout": 0.00037692,
    "usdPayout": 24.5,
    "cryptoType": "BTC"
  }
}
```

### GET /api/history/:playerId
Get player's game history (last 50 rounds).

**Response:**
```json
{
  "success": true,
  "data": {
    "rounds": [
      {
        "roundId": "round_1640995200000",
        "crashPoint": 2.45,
        "players": [...],
        "startTime": "2021-12-31T12:00:00.000Z"
      }
    ],
    "total": 25
  }
}
```

### GET /api/game-state
Get current game state information.

**Response:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "roundId": "round_1640995200000",
    "multiplier": 1.85,
    "crashPoint": null,
    "playerCount": 5,
    "cashedOutCount": 2
  }
}
```

## 🔌 WebSocket Events

### Client → Server Events

#### `cashout`
Request to cash out during active round.
```json
{
  "playerId": "player_123"
}
```

### Server → Client Events

#### `roundStart`
New round has started.
```json
{
  "roundId": "round_1640995200000",
  "multiplier": 1.0,
  "seedHash": "a1b2c3d4e5f6..."
}
```

#### `multiplierUpdate`
Real-time multiplier updates (every 100ms).
```json
{
  "roundId": "round_1640995200000",
  "multiplier": 1.85
}
```

#### `roundCrash`
Round has crashed.
```json
{
  "roundId": "round_1640995200000",
  "crashPoint": 2.45,
  "multiplier": 2.45
}
```

#### `playerBet`
A player has placed a bet.
```json
{
  "playerId": "player_123",
  "usdAmount": 10,
  "cryptoType": "BTC",
  "roundId": "round_1640995200000"
}
```

#### `playerCashout`
A player has cashed out.
```json
{
  "playerId": "player_123",
  "multiplier": 2.45,
  "payout": 0.00037692,
  "usdPayout": 24.5,
  "cryptoType": "BTC"
}
```

#### `priceUpdate`
Cryptocurrency prices have been updated.
```json
{
  "prices": {
    "BTC": 65000,
    "ETH": 3500
  },
  "timestamp": 1640995200000
}
```

#### `cashoutSuccess`
Cashout request was successful (sent to requesting client only).
```json
{
  "multiplier": 2.45,
  "payout": 0.00037692,
  "usdPayout": 24.5,
  "cryptoType": "BTC"
}
```

#### `error`
Error occurred during WebSocket operation.
```json
{
  "message": "No active round"
}
```

## 🎲 Provably Fair Algorithm

The crash point generation ensures fairness and transparency:

### Algorithm Steps
1. **Seed Generation**: A cryptographically secure 32-byte random seed is generated for each round
2. **Hash Creation**: The seed is hashed using SHA-256
3. **Random Value Extraction**: First 8 characters of the hash are converted to a decimal value
4. **Crash Point Calculation**:
   ```javascript
   const hash = crypto.createHash('sha256').update(seed).digest('hex');
   const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
   const crashPoint = Math.max(1.01, 1 / (1 - randomValue) * 0.99);
   ```

### Verification
- Each round provides a `seedHash` (SHA-256 of the original seed)
- Players can verify the fairness by:
  1. Taking the original seed (revealed after the round)
  2. Hashing it with SHA-256
  3. Comparing with the provided `seedHash`
  4. Recalculating the crash point using the same algorithm

### Security Features
- Uses Node.js `crypto` module for cryptographically secure randomness
- Seed is generated before the round starts (no manipulation possible)
- Hash is provided to players before crash point is revealed
- Algorithm is deterministic and publicly verifiable

## 💰 USD to Crypto Conversion Logic

### Price Fetching
- **Source**: CoinGecko API (free tier, no API key required)
- **Frequency**: Every 10 seconds
- **Caching**: Prices cached for 10 seconds to respect rate limits
- **Fallback**: Default prices used if API fails (BTC: $65,000, ETH: $3,500)

### Conversion Process

#### Placing a Bet
1. Player bets $10 in BTC
2. Current BTC price: $65,000
3. Crypto amount: $10 ÷ $65,000 = 0.00015385 BTC
4. Amount deducted from wallet: 0.00015385 BTC
5. Price at time of bet is stored for transaction logging

#### Cashing Out
1. Player cashes out at 2.45x multiplier
2. Crypto payout: 0.00015385 BTC × 2.45 = 0.00037692 BTC
3. USD equivalent: 0.00037692 BTC × $65,000 = $24.50
4. Amount added to wallet: 0.00037692 BTC

#### Example Transaction Flow
```javascript
// Bet Transaction
{
  playerId: "player_123",
  type: "bet",
  usdAmount: 10,
  cryptoAmount: 0.00015385,
  cryptoType: "BTC",
  priceAtTime: 65000,
  transactionHash: "0xa1b2c3d4...",
  roundId: "round_1640995200000",
  timestamp: "2021-12-31T12:00:00.000Z"
}

// Cashout Transaction
{
  playerId: "player_123",
  type: "cashout",
  usdAmount: 24.5,
  cryptoAmount: 0.00037692,
  cryptoType: "BTC",
  multiplier: 2.45,
  priceAtTime: 65000,
  transactionHash: "0xe5f6g7h8...",
  roundId: "round_1640995200000",
  timestamp: "2021-12-31T12:00:15.000Z"
}
```

## 🎮 Game Logic Implementation

### Round Lifecycle
1. **Initialization**: New round starts every 10 seconds
2. **Betting Phase**: Players can place bets while `gameState.isActive = true`
3. **Multiplier Growth**: Starts at 1.0x, increases exponentially
4. **Crash Detection**: Game crashes when multiplier reaches predetermined crash point
5. **Payout Processing**: Cashed-out players receive payouts, others lose bets
6. **Data Persistence**: Round data saved to MongoDB
7. **Next Round**: New round starts after 5-second delay

### Multiplier Formula
```javascript
const elapsed = Date.now() - gameState.startTime;
const multiplier = 1 + (elapsed / 1000) * 0.1; // 0.1x per second growth
```

### State Management
```javascript
let gameState = {
  isActive: false,           // Is round currently active
  roundId: null,            // Unique round identifier
  startTime: null,          // Round start timestamp
  multiplier: 1.0,          // Current multiplier
  crashPoint: null,         // Predetermined crash point
  seed: null,               // Cryptographic seed
  players: new Map(),       // Active bets this round
  cashedOut: new Map()      // Players who cashed out
};
```

## 🔒 Security Implementation

### Input Validation
- **Bet Amount**: Must be between $1 and $1,000
- **Cryptocurrency**: Must be supported (BTC or ETH)
- **Player ID**: Must be valid string
- **Round State**: Validates active round before accepting bets/cashouts

### WebSocket Security
- **Message Validation**: All incoming WebSocket messages validated
- **Rate Limiting**: Prevents spam cashout requests
- **Authentication**: Player ID validation for all operations
- **Error Handling**: Graceful error responses without exposing internals

### Database Security
- **Atomic Transactions**: Uses MongoDB transactions for balance updates
- **Race Condition Prevention**: Proper locking mechanisms
- **Input Sanitization**: All database queries use parameterized inputs
- **Index Optimization**: Proper indexing for performance and security

### API Rate Limiting
- **Price Caching**: 10-second cache prevents API abuse
- **Graceful Degradation**: Fallback prices if API fails
- **Error Handling**: Proper error responses for API failures
- **Timeout Handling**: 5-second timeout for external API calls

## 🚀 Deployment Guide

### Frontend Deployment (Netlify)
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Upload `dist` folder to Netlify
3. Update `BACKEND_URL` in `src/App.tsx` to point to deployed backend

### Backend Deployment Options

#### Heroku
```bash
# In server directory
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
```

#### Railway
```bash
# Connect GitHub repository to Railway
# Set environment variables in Railway dashboard
# Deploy automatically on push
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# In server directory
vercel

# Follow prompts to deploy
```

### Environment Variables for Production
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-crash
NODE_ENV=production
PORT=3001
COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Player can create wallet and receive starting balances
- [ ] Cryptocurrency prices update from CoinGecko API
- [ ] Players can place bets in USD, converted to crypto
- [ ] Multiplier increases in real-time during active rounds
- [ ] Players can cash out before crash and receive payouts
- [ ] Game crashes at predetermined multiplier
- [ ] Transaction history is properly logged
- [ ] WebSocket events work correctly
- [ ] Error handling works for invalid inputs
- [ ] Database transactions are atomic

### Load Testing
- Use tools like Artillery or k6 to test concurrent users
- Test WebSocket connection limits
- Verify database performance under load
- Monitor memory usage and CPU utilization

## 🐛 Troubleshooting

### Common Issues

#### Connection Problems
- **Frontend can't connect to backend**: Check CORS settings and backend URL
- **WebSocket connection fails**: Verify Socket.IO configuration and firewall settings
- **Database connection error**: Check MongoDB URI and network connectivity

#### Game Logic Issues
- **Multiplier not updating**: Check WebSocket connection and game state
- **Bets not being accepted**: Verify round is active and wallet has sufficient balance
- **Cashouts failing**: Check if player has active bet and round is still active

#### API Issues
- **Price fetching fails**: Check CoinGecko API status and network connectivity
- **Rate limiting**: Implement proper caching and respect API limits
- **Invalid responses**: Add proper error handling and validation

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in `.env`:
```env
NODE_ENV=development
```

This will provide detailed console logs for:
- WebSocket connections and disconnections
- API requests and responses
- Database operations
- Game state changes
- Error stack traces

## 📊 Performance Optimization

### Backend Optimizations
- **Database Indexing**: Proper indexes on frequently queried fields
- **Connection Pooling**: MongoDB connection pooling for better performance
- **Caching**: Redis caching for frequently accessed data
- **Load Balancing**: Multiple server instances behind load balancer

### Frontend Optimizations
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive components
- **WebSocket Optimization**: Efficient event handling and state updates
- **Bundle Optimization**: Tree shaking and minification

## 📈 Monitoring and Analytics

### Key Metrics to Track
- **Active Users**: Concurrent WebSocket connections
- **Game Rounds**: Rounds per minute, average crash point
- **Financial Metrics**: Total bets, payouts, house edge
- **Performance**: API response times, database query performance
- **Errors**: Error rates, failed transactions, WebSocket disconnections

### Recommended Tools
- **Application Monitoring**: New Relic, DataDog
- **Database Monitoring**: MongoDB Atlas monitoring
- **Error Tracking**: Sentry, Rollbar
- **Analytics**: Custom dashboard with game-specific metrics

## 📄 License

This project is for educational purposes only. Please ensure compliance with gambling regulations in your jurisdiction before deploying to production.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check existing GitHub issues
4. Create a new issue with detailed information

---

**Built with ❤️ using Node.js, Express, MongoDB, React, and Socket.IO**