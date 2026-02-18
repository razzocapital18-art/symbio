export interface LangGraphNode {
  id: string;
  kind: string;
  config: Record<string, unknown>;
}

export function langGraphToSymbioWorkflow(nodes: LangGraphNode[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.kind,
      metadata: node.config
    }))
  };
}
