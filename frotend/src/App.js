import React, { useState } from "react";
import axios from "axios";
import { Graph } from "react-d3-graph";
import "./App.css";

function App() {
  const [resources, setResources] = useState("");
  const [allocation, setAllocation] = useState("");
  const [maxNeed, setMaxNeed] = useState("");
  const [rag, setRag] = useState({
    nodes: [{ id: "Placeholder" }], 
    links: [], 
  });
  const [statusMessage, setStatusMessage] = useState(""); // To display safe/unsafe state
  const [isSafe, setIsSafe] = useState(null);

  const handleInitialize = async () => {
    try {
      const parsedResources = resources.split(",").map(Number);
      const parsedAllocation = allocation
        .split("\n")
        .map((row) => row.split(",").map(Number));
      const parsedMaxNeed = maxNeed
        .split("\n")
        .map((row) => row.split(",").map(Number));

      const response = await axios.post("http://localhost:5000/initialize", {
        total_resources: parsedResources,
        allocation: parsedAllocation,
        max_need: parsedMaxNeed,
      });

      
      if (response.data.safe) {
        setStatusMessage("The system is in a SAFE state.");
        setIsSafe(true);
      } else {
        setStatusMessage("The system is in an UNSAFE state.");
        setIsSafe(false);
      }
    } catch (error) {
      console.error("Error initializing system:", error);
      setStatusMessage("Error initializing system. Please check your inputs.");
      setIsSafe(false);
    }
  };

  const handleFetchRag = async () => {
    try {
      const response = await axios.get("http://localhost:5000/rag");
      setRag({
        nodes: response.data.nodes.map((node) => ({ id: node })),
        links: response.data.edges.map(([source, target]) => ({
          source,
          target,
        })),
      });
    } catch (error) {
      console.error("Error fetching RAG:", error);
    }
  };

  return (
    <div className="app-container">
      <h1>Deadlock Prevention Simulation</h1>
      <div className="input-section">
        <h2>Input System Data</h2>
        <div className="form-group">
          <label>Total Resources (comma-separated):</label>
          <input
            type="text"
            value={resources}
            onChange={(e) => setResources(e.target.value)}
            placeholder="e.g., 10,5,7"
          />
        </div>
        <div className="form-group">
          <label>Allocation Matrix (comma-separated rows):</label>
          <textarea
            value={allocation}
            onChange={(e) => setAllocation(e.target.value)}
            placeholder="e.g.,\n0,1,0\n2,0,0\n3,0,2"
          />
        </div>
        <div className="form-group">
          <label>Max Need Matrix (comma-separated rows):</label>
          <textarea
            value={maxNeed}
            onChange={(e) => setMaxNeed(e.target.value)}
            placeholder="e.g.,\n7,5,3\n3,2,2\n9,0,2"
          />
        </div>
        <button className="btn" onClick={handleInitialize}>
          Initialize System
        </button>
      </div>
      <div className="status-section">
        {statusMessage && (
          <div
            className={`status-message ${
              isSafe ? "safe-state" : "unsafe-state"
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>
      <div className="graph-section">
        <h2>Resource Allocation Graph (RAG)</h2>
        <button className="btn" onClick={handleFetchRag}>
          Show RAG
        </button>
        {rag.nodes.length > 0 && (
          <Graph
            id="rag"
            data={rag}
            config={{
              nodeHighlightBehavior: true,
              node: { color: "lightblue", size: 300 },
              link: {
                highlightColor: "blue",
                renderLabel: true, 
                markerHeight: 6, 
                markerWidth: 6,  
              },
              directed: true, 
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;