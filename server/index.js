// server/index.js
require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const fetch = require("node-fetch"); // install with: npm i node-fetch

const app = express();
const PORT = 4000;

// Enable CORS for frontend requests
app.use(cors());

// Open SQLite database (creates file if it doesn't exist)
const db = new sqlite3.Database("./cache.db");

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    position TEXT,
    team_full_name TEXT,
    team_abbreviation TEXT,
    team_conference TEXT
  )
`, (err) => {
  if (err) console.error("Error creating table:", err);
  else console.log("SQLite table ready.");
});

// Helper function: insert a player into the database
function insertPlayer(player) {
  db.run(
    `INSERT OR IGNORE INTO players
     (id, first_name, last_name, position, team_full_name, team_abbreviation, team_conference)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      player.id,
      player.first_name,
      player.last_name,
      player.position,
      player.team.full_name,
      player.team.abbreviation,
      player.team.conference
    ]
  );
}

// API endpoint with caching
app.get("/api/players", (req, res) => {
  const search = req.query.search;
  if (!search) return res.status(400).json({ error: "Missing search query" });

  // 1️⃣ Check cache first
  db.all(
    "SELECT * FROM players WHERE first_name LIKE ? OR last_name LIKE ?",
    [`%${search}%`, `%${search}%`],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (rows.length > 0) {
        // Return cached results
        return res.json({ data: rows });
      }

      // 2️⃣ Not in cache → fetch from API
      try {
        const response = await fetch(
          `https://api.balldontlie.io/v1/players?search=${search}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BALLDONTLIE_API_KEY}`,
            },
          }
        );

        if (response.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded, try again later" });
        }

        if (!response.ok) {
          return res.status(response.status).json({ error: "Failed to fetch data from API" });
        }

        const data = await response.json();
        const players = data.data || [];

        // 3️⃣ Save fetched players to SQLite
        players.forEach(insertPlayer);

        // 4️⃣ Return fetched data
        res.json({ data: players });
      } catch (apiErr) {
        console.error("API fetch error:", apiErr);
        res.status(500).json({ error: "Failed to fetch data" });
      }
    }
  );
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));