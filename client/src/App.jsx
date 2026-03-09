import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:4000/api/players?search=${query}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.data || []);
        setVisibleCount(5); // reset pagination for new search
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Try again later.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const loadMore = () => setVisibleCount(prev => prev + 5);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Sports Analytics App</h1>

      <input
        type="text"
        placeholder="Search player..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleKeyPress} // fetch only on Enter
        style={{ padding: "0.5rem", width: "300px" }}
      />
      <button onClick={handleSearch} style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}>
        Search
      </button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
        {results.slice(0, visibleCount).map(player => (
          <li key={player.id} style={{ marginBottom: "1rem" }}>
            <strong>{player.first_name} {player.last_name}</strong> - {player.position || "N/A"}
            <br />
            Team: {player.team.full_name} ({player.team.abbreviation}) - {player.team.conference} Conference
          </li>
        ))}
      </ul>

      {results.length > visibleCount && (
        <button onClick={loadMore} style={{ padding: "0.5rem 1rem" }}>
          Load More
        </button>
      )}
    </div>
  );
}

export default App;