export interface AutoGenAgent {
  name: string;
  capabilities: string[];
}

export function autogenTeamToSwarmPayload(agents: AutoGenAgent[]) {
  return {
    swarmMembers: agents.map((agent) => ({
      name: agent.name,
      skills: agent.capabilities
    }))
  };
}
