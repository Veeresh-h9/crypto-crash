const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/crypto-crash";

// Global variables
let db;
let gameState = {
  isActive: false,
  roundId: null,
  startTime: null,
  multiplier: 1.0,
  crashPoint: null,
  players: new Map(),
  cashedOut: new Map(),
  isBettingOpen: false,
};

let cryptoPrices = { BTC: 65000, ETH: 3500 }; // Fallback prices
let priceUpdateInterval;

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log("✅ Connected to MongoDB");

    // Create collections if they don't exist
    await db.createCollection("wallets").catch(() => {});
    await db.createCollection("rounds").catch(() => {});
    await db.createCollection("transactions").catch(() => {});
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Continue without database for testing
    console.log("⚠️ Running without database");
  }
}

// Fetch crypto prices
async function fetchCryptoPrices() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
      { timeout: 5000 }
    );

    cryptoPrices = {
      BTC: response.data.bitcoin.usd,
      ETH: response.data.ethereum.usd,
    };

    console.log("📈 Updated prices:", cryptoPrices);

    // Broadcast to all clients
    io.emit("priceUpdate", { prices: cryptoPrices });
  } catch (error) {
    console.error("❌ Price fetch error:", error.message);
    // Keep using fallback prices
  }
}

// Generate crash point using provably fair algorithm
function generateCrashPoint() {
  const seed = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const randomValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  const crashPoint = Math.max(1.01, (1 / (1 - randomValue)) * 0.99);
  return { crashPoint: Math.min(crashPoint, 100), seed };
}

// Initialize player wallet
async function getOrCreateWallet(username) {
  if (!db) {
    // Return mock wallet if no database
    return {
      username,
      balances: { BTC: 0.01, ETH: 1.0 },
    };
  }

  try {
    let wallet = await db.collection("wallets").findOne({ username });
    if (!wallet) {
      wallet = {
        username,
        balances: { BTC: 0.01, ETH: 1.0 },
        createdAt: new Date(),
      };
      await db.collection("wallets").insertOne(wallet);
    }
    return wallet;
  } catch (error) {
    console.error("Wallet error:", error);
    return { username, balances: { BTC: 0.01, ETH: 1.0 } };
  }
}

// Start new round
async function startNewRound() {
  const { crashPoint, seed } = generateCrashPoint();

  gameState = {
    ...gameState, // keep players and cashedOut as is
    isActive: true,
    roundId: `round_${Date.now()}`,
    startTime: Date.now(),
    multiplier: 1.0,
    crashPoint,
    seed,
    isBettingOpen: false,
  };

  console.log(
    `🎮 New round: ${gameState.roundId}, Crash: ${crashPoint.toFixed(2)}x`
  );

  // Broadcast round start
  io.emit("roundStart", {
    roundId: gameState.roundId,
    multiplier: 1.0,
  });

  // Start multiplier updates
  updateMultiplier();
}

// Update multiplier
function updateMultiplier() {
  if (!gameState.isActive) return;

  const elapsed = (Date.now() - gameState.startTime) / 1000;
  gameState.multiplier = 1 + elapsed * 0.1; // 0.1x per second

  // Check if should crash
  if (gameState.multiplier >= gameState.crashPoint) {
    crashGame();
    return;
  }

  // Broadcast multiplier update
  io.emit("multiplierUpdate", {
    roundId: gameState.roundId,
    multiplier: gameState.multiplier,
  });

  // Schedule next update
  setTimeout(updateMultiplier, 100);
}

// Crash the game
async function crashGame() {
  gameState.isActive = false;

  console.log(`💥 Game crashed at ${gameState.crashPoint.toFixed(2)}x`);

  // Broadcast crash
  io.emit("roundCrash", {
    roundId: gameState.roundId,
    crashPoint: gameState.crashPoint,
  });

  // Emit crash display event for 5 seconds
  io.emit("crashDisplay", {
    crashPoint: gameState.crashPoint,
    roundId: gameState.roundId,
  });

  // After 5 seconds, open betting for 10 seconds
  setTimeout(() => {
    // Reset players and cashedOut for the new betting phase
    gameState.players = new Map();
    gameState.cashedOut = new Map();

    io.emit("bettingOpen", {
      message: "Place your bets now!",
      duration: 10000,
    });
    gameState.isBettingOpen = true;

    // After 10 seconds, start new round
    setTimeout(() => {
      gameState.isBettingOpen = false;
      startNewRound();
    }, 10000);
  }, 5000);

  // Save round to database
  if (db) {
    try {
      await db.collection("rounds").insertOne({
        roundId: gameState.roundId,
        crashPoint: gameState.crashPoint,
        seed: gameState.seed,
        startTime: new Date(gameState.startTime),
        endTime: new Date(),
        players: Array.from(gameState.players.entries()),
      });
    } catch (error) {
      console.error("Error saving round:", error);
    }
  }
}

// API Routes

// Get crypto prices
app.get("/api/prices", (req, res) => {
  res.json({
    success: true,
    data: { prices: cryptoPrices },
  });
});

// Get/Create wallet
app.post("/api/wallet/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const wallet = await getOrCreateWallet(username);

    const balancesWithUSD = {};
    for (const [crypto, amount] of Object.entries(wallet.balances)) {
      balancesWithUSD[crypto] = {
        amount,
        usdValue: amount * cryptoPrices[crypto],
      };
    }

    res.json({
      success: true,
      data: { username, balances: balancesWithUSD },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Place bet
app.post("/api/bet", async (req, res) => {
  try {
    const { username, usdAmount, cryptoType } = req.body;

    // Validation
    if (!username || !usdAmount || !cryptoType) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    if (usdAmount < 1 || usdAmount > 1000) {
      return res
        .status(400)
        .json({ success: false, error: "Bet must be between $1 and $1000" });
    }

    if (!["BTC", "ETH"].includes(cryptoType)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid crypto type" });
    }

    if (gameState.players.has(username)) {
      return res
        .status(400)
        .json({ success: false, error: "Already placed bet this round" });
    }
    // Only allow bets when round is NOT active
    if (gameState.isActive) {
      return res
        .status(400)
        .json({ success: false, error: "Betting is closed" });
    }

    // Convert USD to crypto
    const cryptoAmount = usdAmount / cryptoPrices[cryptoType];

    // Check wallet balance
    const wallet = await getOrCreateWallet(username);
    if (wallet.balances[cryptoType] < cryptoAmount) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient balance" });
    }

    // Update wallet balance
    if (db) {
      try {
        await db
          .collection("wallets")
          .updateOne(
            { username },
            { $inc: { [`balances.${cryptoType}`]: -cryptoAmount } }
          );
      } catch (error) {
        console.error("Error updating wallet:", error);
      }
    }

    // Add to game state
    gameState.players.set(username, {
      usdAmount,
      cryptoAmount,
      cryptoType,
      priceAtTime: cryptoPrices[cryptoType],
    });

    // Broadcast bet
    io.emit("playerBet", {
      username,
      usdAmount,
      cryptoType,
      roundId: gameState.roundId,
    });

    res.json({
      success: true,
      data: {
        roundId: gameState.roundId,
        usdAmount,
        cryptoAmount,
        cryptoType,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// User login/register
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ success: false, error: "Username and password required" });

  try {
    let user = await db.collection("users").findOne({ username });
    if (!user) {
      // New user: create with default balance
      user = { username, password, balance: 1000, createdAt: new Date() };
      await db.collection("users").insertOne(user);
    } else if (user.password !== password) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid password" });
    }
    res.json({
      success: true,
      data: { username: user.username, balance: user.balance },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket handling
io.on("connection", (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  // Send current game state
  if (gameState.isActive) {
    socket.emit("roundStart", {
      roundId: gameState.roundId,
      multiplier: gameState.multiplier,
    });
  }

  // Send current prices
  socket.emit("priceUpdate", { prices: cryptoPrices });

  // Handle cashout
  socket.on("cashout", async (data) => {
    try {
      const { username } = data;

      const bet = gameState.players.get(username);
      if (!bet) {
        socket.emit("error", { message: "No bet placed" });
        return;
      }

      if (gameState.cashedOut.has(username)) {
        socket.emit("error", { message: "Already cashed out" });
        return;
      }

      // Calculate payout
      const payout = bet.cryptoAmount * gameState.multiplier;
      const usdPayout = payout * cryptoPrices[bet.cryptoType];

      // Update wallet
      if (db) {
        try {
          await db
            .collection("wallets")
            .updateOne(
              { username },
              { $inc: { [`balances.${bet.cryptoType}`]: payout } }
            );
        } catch (error) {
          console.error("Error updating wallet:", error);
        }
      }

      // Mark as cashed out
      gameState.cashedOut.set(username, {
        multiplier: gameState.multiplier,
        payout,
        usdPayout,
      });

      // Broadcast cashout
      io.emit("playerCashout", {
        username,
        multiplier: gameState.multiplier,
        payout,
        usdPayout,
        cryptoType: bet.cryptoType,
      });

      // Send success to player
      socket.emit("cashoutSuccess", {
        multiplier: gameState.multiplier,
        payout,
        usdPayout,
        cryptoType: bet.cryptoType,
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`👤 User disconnected: ${socket.id}`);
  });
});

// Initialize game
async function initializeGame() {
  console.log("🚀 Initializing Crypto Crash Game...");

  // Connect to database
  await connectDB();

  // Fetch initial prices
  await fetchCryptoPrices();

  // Set up price updates every 10 seconds
  priceUpdateInterval = setInterval(fetchCryptoPrices, 10000);

  // Start first round
  await startNewRound();

  console.log("✅ Game initialized successfully");
}

// Start server
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  initializeGame();
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Shutting down gracefully...");
  if (priceUpdateInterval) clearInterval(priceUpdateInterval);
  server.close();
});
