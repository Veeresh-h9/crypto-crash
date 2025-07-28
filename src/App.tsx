import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { TrendingUp, Wallet, DollarSign, Bitcoin } from "lucide-react";
import Login from "./components/Login";

interface GameState {
  isActive: boolean;
  roundId: string | null;
  multiplier: number;
  crashPoint: number | null;
}

interface WalletBalance {
  BTC: { amount: number; usdValue: number };
  ETH: { amount: number; usdValue: number };
}

interface CryptoPrices {
  BTC: number;
  ETH: number;
}

const BACKEND_URL = "https://crash-game-setup.onrender.com";
function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isActive: false,
    roundId: null,
    multiplier: 1.0,
    crashPoint: null,
  });

  const [] = useState(
    () => `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [betAmount, setBetAmount] = useState<number>(10);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("BTC");
  const [hasBet, setHasBet] = useState<boolean>(false);
  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    BTC: { amount: 0, usdValue: 0 },
    ETH: { amount: 0, usdValue: 0 },
  });
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    BTC: 65000,
    ETH: 3500,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting...");
  const [lastWin, setLastWin] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("betting"); // <-- Add phase state
  const [crashPoint, setCrashPoint] = useState<number | null>(null); // <-- Add crashPoint state

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    // Connection events
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnectionStatus("Connected");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnectionStatus("Disconnected");
    });

    // Game events
    newSocket.on("roundStart", (data) => {
      setPhase("active");
      setGameState({
        isActive: true,
        roundId: data.roundId,
        multiplier: data.multiplier,
        crashPoint: null,
      });
      setHasCashedOut(false);
      setLastWin(null);
    });

    newSocket.on("multiplierUpdate", (data) => {
      setGameState((prev) => ({
        ...prev,
        multiplier: data.multiplier,
      }));
    });

    newSocket.on("roundCrash", (data) => {
      console.log("Round crashed:", data);
      setGameState((prev) => ({
        ...prev,
        isActive: false,
        crashPoint: data.crashPoint,
      }));
    });

    newSocket.on("priceUpdate", (data) => {
      setCryptoPrices(data.prices);
    });

    newSocket.on("cashoutSuccess", (data) => {
      console.log("Cashout successful:", data);
      setHasCashedOut(true);
      setLastWin(data);
      loadWalletBalance();
    });

    newSocket.on("error", (data) => {
      console.error("Socket error:", data);
      alert(`Error: ${data.message}`);
    });

    // Custom events for phase management
    newSocket.on("crashDisplay", (data) => {
      setPhase("crash");
      setCrashPoint(data.crashPoint);
      setHasBet(false);
      setHasCashedOut(false);
    });

    newSocket.on("bettingOpen", () => {
      setPhase("betting");
      setGameState((prev) => ({ ...prev, isActive: false }));

      setHasCashedOut(false);
    });

    // Load initial data
    loadWalletBalance();
    loadCryptoPrices();

    return () => {
      newSocket.close();
    };
  }, [username]);

  const loadWalletBalance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wallet/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (result.success) {
        setWalletBalance(result.data.balances);
      }
    } catch (error) {
      console.error("Error loading wallet:", error);
    }
  };

  const loadCryptoPrices = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/prices`);
      const result = await response.json();

      if (result.success) {
        setCryptoPrices(result.data.prices);
      }
    } catch (error) {
      console.error("Error loading prices:", error);
    }
  };

  const placeBet = async () => {
    // Only allow placing bet during the betting phase
    if (phase !== "betting" || hasBet || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          usdAmount: betAmount,
          cryptoType: selectedCrypto,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setHasBet(true);
        loadWalletBalance();
        console.log("Bet placed successfully:", result.data);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      alert("Error placing bet. Please try again.");
    }
    setLoading(false);
  };

  const cashOut = async () => {
    if (!gameState.isActive || !hasBet || hasCashedOut || loading) return;

    setLoading(true);
    try {
      if (socket && username) {
        socket.emit("cashout", { username }); // <-- use username here
      }
    } catch (error) {
      console.error("Error cashing out:", error);
      alert("Error cashing out. Please try again.");
    }
    setLoading(false);
  };

  const getMultiplierColor = () => {
    if (!gameState.isActive) {
      return gameState.crashPoint ? "text-red-500" : "text-gray-400";
    }
    if (gameState.multiplier < 2) return "text-green-400";
    if (gameState.multiplier < 5) return "text-yellow-400";
    if (gameState.multiplier < 10) return "text-orange-400";
    return "text-red-400";
  };

  const formatCrypto = (amount: number, crypto: string) => {
    const decimals = crypto === "BTC" ? 8 : 6;
    return `${amount.toFixed(decimals)} ${crypto}`;
  };

  const formatUSD = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Add this conditional rendering at the top of your return statement:
  if (!username) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 flex flex-col items-center">
          <Login
            onLogin={(uname) => {
              setUsername(uname);
            }}
          />
          <div className="mt-6 w-full">
            <h3 className="text-lg font-semibold mb-4 text-purple-300 text-center">
              New User Wallet
            </h3>
            <div className="space-y-3">
              {Object.entries(walletBalance).map(([crypto, balance]) => (
                <div
                  key={crypto}
                  className="flex justify-between items-center p-3 bg-purple-900/20 rounded-lg border border-purple-500/20"
                >
                  <div>
                    <div className="font-medium text-white">
                      {formatCrypto(balance.amount, crypto)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatUSD(balance.usdValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-purple-400 font-medium">
                      {crypto}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={loadWalletBalance}
              className="w-full mt-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              Refresh Balance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Crypto Crash
              </h1>
              <p className="text-xs text-gray-400 ">Provably Fair Gaming</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div
              className={`flex items-center space-x-2 text-sm px-3 py-1 rounded-full ${
                connectionStatus === "Connected"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "Connected"
                    ? "bg-green-400"
                    : "bg-red-400"
                }`}
              />
              <span>{connectionStatus}</span>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Bitcoin className="w-4 h-4 text-orange-400" />
                <span>BTC: {formatUSD(cryptoPrices.BTC || 0)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-400 rounded-full text-xs flex items-center justify-center font-bold">
                  E
                </div>
                <span>ETH: {formatUSD(cryptoPrices.ETH || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
          {/* Multiplier Display */}
          <div className="text-center mb-8">
            <div
              className={`text-8xl font-bold mb-4 transition-all duration-100 ${getMultiplierColor()}`}
            >
              {gameState.isActive
                ? `${gameState.multiplier.toFixed(2)}x`
                : gameState.crashPoint
                ? `CRASHED at ${gameState.crashPoint.toFixed(2)}x`
                : "Waiting for next round..."}
            </div>

            {gameState.isActive && (
              <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-6 py-3 inline-block animate-pulse">
                <span className="text-green-400 font-semibold flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>🚀 FLYING HIGH</span>
                </span>
              </div>
            )}

            {!gameState.isActive && gameState.crashPoint && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-6 py-3 inline-block">
                <span className="text-red-400 font-semibold">💥 CRASHED</span>
              </div>
            )}

            {lastWin && (
              <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-lg px-6 py-3 inline-block">
                <div className="text-green-400 font-semibold">
                  Won {formatUSD(lastWin.usdPayout)} at{" "}
                  {lastWin.multiplier.toFixed(2)}x!
                </div>
              </div>
            )}
          </div>

          {/* Betting Interface */}
          <div className="bg-purple-900/30 rounded-xl p-6 border border-purple-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Bet Amount */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-300">
                  Bet Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    disabled={hasBet || loading || phase !== "betting"}
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-purple-500/40 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                    placeholder="10"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>

              {/* Crypto Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-300">
                  Cryptocurrency
                </label>
                <select
                  value={selectedCrypto}
                  onChange={(e) => setSelectedCrypto(e.target.value)}
                  disabled={hasBet || loading || phase !== "betting"}
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/40 rounded-lg text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={placeBet}
                disabled={
                  phase !== "betting" || hasBet || loading || betAmount <= 0
                }
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <DollarSign className="w-5 h-5" />
                <span>
                  {loading && !hasBet
                    ? "Placing..."
                    : hasBet
                    ? "Bet Placed"
                    : "Place Bet"}
                </span>
              </button>

              <button
                onClick={cashOut}
                disabled={
                  !gameState.isActive || !hasBet || hasCashedOut || loading
                }
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <TrendingUp className="w-5 h-5" />
                <span>
                  {loading && hasBet && !hasCashedOut
                    ? "Cashing..."
                    : hasCashedOut
                    ? "Cashed Out"
                    : "Cash Out"}
                </span>
              </button>
            </div>

            {/* Bet Status */}
            {hasBet && (
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-blue-400">Active Bet:</span>
                  <span className="text-white font-medium">
                    {formatUSD(betAmount)} ({selectedCrypto})
                  </span>
                </div>
                {gameState.isActive && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-blue-400">Potential Win:</span>
                    <span className="text-green-400 font-medium">
                      {formatUSD(betAmount * gameState.multiplier)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Phase Messages */}
            {phase === "crash" && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-sm">
                <span className="text-red-400 font-semibold">
                  Crashed at {crashPoint}x
                </span>
              </div>
            )}
            {phase === "betting" && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500/40 rounded-lg text-sm">
                <span className="text-green-400 font-semibold">
                  Starting new bet! Place your bet now.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold">Wallet</h3>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(walletBalance).map(([crypto, balance]) => (
                <div
                  key={crypto}
                  className="flex justify-between items-center p-3 bg-purple-900/20 rounded-lg border border-purple-500/20"
                >
                  <div>
                    <div className="font-medium text-white">
                      {formatCrypto(balance.amount, crypto)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatUSD(balance.usdValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-purple-400 font-medium">
                      {crypto}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={loadWalletBalance}
              className="w-full mt-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              Refresh Balance
            </button>
          </div>

          {/* Game Info */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
            <h3 className="text-lg font-semibold mb-4">Game Info</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Min Bet:</span>
                <span className="text-white">$1.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Bet:</span>
                <span className="text-white">$1,000.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Round ID:</span>
                <span className="text-white text-xs">
                  {gameState.roundId || "None"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
