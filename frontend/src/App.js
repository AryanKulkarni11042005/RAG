import React, { useState, useCallback } from "react";
import axios from "axios";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css'; // Import react-flow styles
import "./App.css";

const initialNodes = [{ id: 'placeholder', position: { x: 0, y: 0 }, data: { label: 'Initialize System and Fetch RAG' } }];

function App() {
  const [resources, setResources] = useState("");
  const [allocation, setAllocation] = useState("");
  const [maxNeed, setMaxNeed] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSafe, setIsSafe] = useState(null);
  const [safeSequence, setSafeSequence] = useState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleInitialize = async () => {
    setStatusMessage("Initializing...");
    setIsSafe(null);
    try {
      // Basic validation for empty inputs
      if (!resources || !allocation || !maxNeed) {
         setStatusMessage("Please fill in all input fields.");
         setIsSafe(false);
         return;
      }

      const parsedResources = resources.split(",").map(Number);
      const parsedAllocation = allocation
        .split("\n")
        .map((row) => row.trim().split(",").map(Number));
      const parsedMaxNeed = maxNeed
        .split("\n")
        .map((row) => row.trim().split(",").map(Number));

      // Add more robust validation if needed (e.g., check array dimensions)

      const response = await axios.post("http://localhost:5000/initialize", {
        total_resources: parsedResources,
        allocation: parsedAllocation,
        max_need: parsedMaxNeed,
      });

      if (response.data.safe !== undefined) {
         setStatusMessage(response.data.safe ? "System is in a SAFE state." : "System is in an UNSAFE state.");
         setIsSafe(response.data.safe);
         
         // Store the safe sequence if available
         if (response.data.safe_sequence) {
           setSafeSequence(response.data.safe_sequence);
         } else {
           setSafeSequence([]);
         }
      } else {
         setStatusMessage("Initialization complete, but safety status unknown.");
         setIsSafe(null); // Or handle as appropriate
      }
      // Optionally fetch RAG immediately after initialization
      // handleFetchRag();

    } catch (error) {
      console.error("Error initializing system:", error);
      let errorMsg = "Error initializing system.";
      if (error.response) {
        errorMsg += ` Server responded with ${error.response.status}.`;
      } else if (error.request) {
        errorMsg += " No response received from server.";
      } else {
        errorMsg += ` ${error.message}`;
      }
       setStatusMessage(errorMsg + " Please check inputs and backend connection.");
       setIsSafe(false);
       setNodes(initialNodes); // Reset graph on error
       setEdges([]);
    }
  };

  const handleFetchRag = async () => {
     setStatusMessage("Fetching RAG...");
    try {
      const response = await axios.get("http://localhost:5000/rag");
      const backendNodes = response.data.nodes || [];
      const backendEdges = response.data.edges || [];

      // --- Transform data for React Flow ---
      const flowNodes = backendNodes.map((nodeId, index) => {
         const isProcess = nodeId.startsWith('P'); // Check if it's a process node
         return {
            id: nodeId,
            position: { x: (index % 5) * 150, y: Math.floor(index / 5) * 100 },
            data: { label: nodeId },
            style: {
               background: isProcess ? '#D1E8FF' : '#FFD1D1', // Blue for processes, Red for resources
               border: '1px solid #333',
               borderRadius: isProcess ? '50%' : '5px', // Makes processes circles, resources rectangles/squares
               width: 50, // Adjust size as needed
               height: 50, // Adjust size as needed
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
            },
         };
      });

      const flowEdges = backendEdges.map(([source, target], index) => ({
         id: `e${index}-${source}-${target}`,
         source: source,
         target: target,
         animated: false, // Make edges animated if desired
         markerEnd: { // Add arrows
            type: 'arrowclosed',
         },
      }));
      // --- End Transformation ---

      setNodes(flowNodes.length > 0 ? flowNodes : initialNodes); // Set nodes or default if empty
      setEdges(flowEdges);
      setStatusMessage(statusMessage || "RAG fetched successfully."); // Keep existing status or update

    } catch (error) {
      console.error("Error fetching RAG:", error);
      setStatusMessage("Error fetching RAG. Is the backend running?");
      setNodes(initialNodes); // Reset graph on error
      setEdges([]);
    }
  };

  return (
    <div className="app-container">
      <h1>Deadlock Prevention Simulation</h1>
      <div className="controls-container">
         <div className="input-section">
            <h2>Input System Data</h2>
            {/* Input fields remain the same */}
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
               <label>Allocation Matrix (rows on new lines, comma-separated):</label>
               <textarea
                 value={allocation}
                 onChange={(e) => setAllocation(e.target.value)}
                 placeholder="e.g.,&#10;0,1,0&#10;2,0,0&#10;3,0,2"
                 rows={5}
               />
             </div>
             <div className="form-group">
               <label>Max Need Matrix (rows on new lines, comma-separated):</label>
               <textarea
                 value={maxNeed}
                 onChange={(e) => setMaxNeed(e.target.value)}
                 placeholder="e.g.,&#10;7,5,3&#10;3,2,2&#10;9,0,2"
                 rows={5}
               />
             </div>
            <button className="btn" onClick={handleInitialize}>
              Initialize & Check Safety
            </button>
             <button className="btn" onClick={handleFetchRag} style={{marginLeft: '10px'}}>
               Fetch/Update RAG
             </button>
         </div>
         <div className="status-section">
            {statusMessage && (
              <div
                className={`status-message ${
                  isSafe === true ? "safe-state" : isSafe === false ? "unsafe-state" : "neutral-state"
                }`}
              >
                {statusMessage}
              </div>
            )}
            
            {/* Display safe sequence if available */}
            {isSafe && safeSequence.length > 0 && (
              <div className="safe-sequence">
                <h3>Safe Sequence</h3>
                <p>{safeSequence.map(process => `P${process}`).join(" → ")}</p>
              </div>
            )}
         </div>
      </div>

      <div className="graph-section">
        <h2>Resource Allocation Graph (RAG)</h2>
        <div style={{ height: '500px', border: '1px solid #ddd', background: '#f0f0f0' }}> {/* Container for ReactFlow */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView // Automatically fits the view to the graph elements
          >
            <Controls /> {/* Adds zoom/pan controls */}
            <MiniMap /> {/* Adds a minimap */}
            <Background variant="dots" gap={12} size={1} /> {/* Adds a background */}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default App;