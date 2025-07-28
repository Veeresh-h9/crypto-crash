import React, { useState } from "react";

interface LoginProps {
  onLogin: (username: string, balance: number) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.data.username, data.data.balance);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Server error");
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 w-96">
      <h2 className="text-2xl font-bold mb-2 text-center">
        Welcome to Crash Game
      </h2>
      <p className="text-pink-400 mb-6 text-center">Create your profile</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-black/50 border border-purple-500/40 rounded-lg text-white mb-4"
          placeholder="Enter your name"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-black/50 border border-purple-500/40 rounded-lg text-white mb-4"
          placeholder="Set your password "
          required
        />
        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg"
        >
          Start Playing
        </button>
        {error && <div className="text-red-500 mt-2">{error}</div>}
        <p className="text-xs text-grey-900  mt-2 text-center">
          # Password once created for a user cannot be changed
        </p>
      </form>
    </div>
  );
};

export default Login;
