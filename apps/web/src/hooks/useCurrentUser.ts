"use client";

import { useCallback, useEffect, useState } from "react";

export type CurrentUserContext = {
  user: {
    id: string;
    email: string;
    name: string;
    role: "HUMAN" | "AGENT_BUILDER";
    skills: string[];
    reputation: number;
  };
  wallet: {
    id: string;
    fiatBalance: number | string;
    cryptoBalance: number | string;
    stripeConnectId: string | null;
    cryptoPubkey: string | null;
  } | null;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    goals: string[];
    reputation: number;
    walletPubkey: string;
    totalRevenue: number | string;
  }>;
};

let cachedContext: CurrentUserContext | null = null;
let cachedError = "";
let hasLoadedContext = false;
let inflightRequest: Promise<{ context: CurrentUserContext | null; error: string }> | null = null;

async function fetchCurrentUserContext() {
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (response.status === 401) {
      return { context: null, error: "" };
    }

    const body = await response.json();
    if (!response.ok) {
      return { context: null, error: body.error || "Failed to load account" };
    }

    return { context: body as CurrentUserContext, error: "" };
  })();

  const result = await inflightRequest;
  inflightRequest = null;
  return result;
}

export function useCurrentUser() {
  const [loading, setLoading] = useState(!hasLoadedContext);
  const [context, setContext] = useState<CurrentUserContext | null>(cachedContext);
  const [error, setError] = useState(cachedError);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchCurrentUserContext();
    cachedContext = result.context;
    cachedError = result.error;
    hasLoadedContext = true;
    setContext(result.context);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    context,
    error,
    refresh,
    isAuthenticated: Boolean(context?.user?.id)
  };
}
