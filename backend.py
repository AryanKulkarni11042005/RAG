from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global state
total_resources = []
allocation = []
max_need = []
available = []

@app.route('/initialize', methods=['POST'])
def initialize():
    global total_resources, allocation, max_need, available
    data = request.get_json()
    total_resources = data['total_resources']
    allocation = data['allocation']
    max_need = data['max_need']

    # Recompute available = total - sum of allocations per resource
    available = [
        total_resources[i] - sum(allocation[p][i] for p in range(len(allocation)))
        for i in range(len(total_resources))
    ]

    safe = is_safe()
    return jsonify({
        "message": "System initialized",
        "available": available,
        "safe": safe
    })


@app.route('/allocate', methods=['POST'])
def allocate():
    global allocation, available
    data = request.get_json()
    pid = data['process']
    req = data['request']

    # Check request ≤ available
    if any(req[i] > available[i] for i in range(len(available))):
        return jsonify({"message": "Request denied (insufficient resources)"}), 400

    # Tentatively allocate
    available = [available[i] - req[i] for i in range(len(available))]
    allocation[pid] = [allocation[pid][i] + req[i] for i in range(len(req))]

    if is_safe():
        return jsonify({"message": "Request granted", "available": available})
    else:
        # Rollback
        available = [available[i] + req[i] for i in range(len(available))]
        allocation[pid] = [allocation[pid][i] - req[i] for i in range(len(req))]
        return jsonify({"message": "Request denied (would lead to unsafe state)"}), 403


@app.route('/rag', methods=['GET'])
def rag():
    G = nx.DiGraph()

    n_procs = len(allocation)
    n_res = len(total_resources)

    # Add all nodes
    for i in range(n_procs):
        G.add_node(f"P{i}", type="process")
    for j in range(n_res):
        G.add_node(f"R{j}", type="resource")

    # Allocation edges: Resource -> Process
    for i in range(n_procs):
        for j in range(n_res):
            if allocation[i][j] > 0:
                G.add_edge(f"R{j}", f"P{i}")

    # Request edges: Process -> Resource (based on Need = Max - Alloc)
    for i in range(n_procs):
        for j in range(n_res):
            need = max_need[i][j] - allocation[i][j]
            if need > 0:
                G.add_edge(f"P{i}", f"R{j}")

    return jsonify({
        "nodes": list(G.nodes),
        "edges": list(G.edges)
    })


def is_safe():
    """Banker’s Algorithm safety check."""
    work = available.copy()
    finish = [False] * len(allocation)

    while True:
        allocated_in_this_round = False
        for i in range(len(allocation)):
            if not finish[i]:
                need_i = [max_need[i][j] - allocation[i][j] for j in range(len(work))]
                if all(need_i[j] <= work[j] for j in range(len(work))):
                    # simulate finishing P_i
                    work = [work[j] + allocation[i][j] for j in range(len(work))]
                    finish[i] = True
                    allocated_in_this_round = True
        if not allocated_in_this_round:
            break

    return all(finish)


if __name__ == '__main__':
    app.run(debug=True)
