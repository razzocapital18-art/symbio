"use client";

import { useMemo } from "react";
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  { id: "goal", type: "input", data: { label: "Goal Node" }, position: { x: 40, y: 20 } },
  { id: "llm", data: { label: "LLM Node" }, position: { x: 280, y: 120 } },
  { id: "tool", data: { label: "Tool Node" }, position: { x: 520, y: 220 } }
];

const initialEdges = [
  { id: "e1-2", source: "goal", target: "llm", animated: true },
  { id: "e2-3", source: "llm", target: "tool", animated: true }
];

export function AgentBuilderFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const exportPayload = useMemo(() => JSON.stringify({ nodes, edges }, null, 2), [nodes, edges]);

  return (
    <div className="space-y-4">
      <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium">Export deployable config</summary>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-white">{exportPayload}</pre>
      </details>
    </div>
  );
}
