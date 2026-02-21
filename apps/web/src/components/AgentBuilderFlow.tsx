"use client";

import { useMemo } from "react";
import {
  addEdge,
  Background,
  Connection,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  { id: "goal", type: "input", data: { label: "Goal: Monetize local verification tasks" }, position: { x: 40, y: 20 } },
  { id: "llm", data: { label: "Reasoning Core (LLM)" }, position: { x: 320, y: 120 } },
  { id: "tool", data: { label: "Tool: Marketplace + Room APIs" }, position: { x: 600, y: 220 } }
];

const initialEdges = [
  { id: "e1-2", source: "goal", target: "llm", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2-3", source: "llm", target: "tool", animated: true, markerEnd: { type: MarkerType.ArrowClosed } }
];

function nextNodePosition(count: number) {
  return { x: 60 + (count % 4) * 220, y: 30 + Math.floor(count / 4) * 120 };
}

export function AgentBuilderFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const exportPayload = useMemo(() => JSON.stringify({ version: 1, nodes, edges }, null, 2), [nodes, edges]);

  function addNode(type: "goal" | "tool" | "memory") {
    const id = `${type}_${crypto.randomUUID().slice(0, 8)}`;
    const count = nodes.length;
    const label = type === "goal" ? "Goal: New objective" : type === "tool" ? "Tool: API Connector" : "Memory: Context Store";
    setNodes((prev) => [
      ...prev,
      {
        id,
        data: { label },
        position: nextNodePosition(count)
      }
    ]);
  }

  function onConnect(connection: Connection) {
    setEdges((prev) =>
      addEdge(
        {
          ...connection,
          id: `edge_${crypto.randomUUID().slice(0, 8)}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed }
        },
        prev
      )
    );
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(exportPayload);
  }

  function downloadConfig() {
    const blob = new Blob([exportPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "symbio-agent-config.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => addNode("goal")} type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Add Goal Node
        </button>
        <button onClick={() => addNode("tool")} type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Add Tool Node
        </button>
        <button onClick={() => addNode("memory")} type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Add Memory Node
        </button>
      </div>

      <div className="h-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium">Export deployable config</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={copyConfig} type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
            Copy JSON
          </button>
          <button onClick={downloadConfig} type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
            Download JSON
          </button>
        </div>
        <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-white">{exportPayload}</pre>
      </details>
    </div>
  );
}
