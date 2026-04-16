"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { fetchWorkspaceSummary, isLoggedIn, WorkspaceSummary } from "@/lib/api";
import { isPublicRoute } from "@/lib/routes";

type WorkspaceContextValue = {
  workspace: WorkspaceSummary | null;
  loading: boolean;
  refresh: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (isPublicRoute(pathname) || !isLoggedIn()) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWorkspaceSummary()
      .then(setWorkspace)
      .catch(() => setWorkspace(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (ctx === undefined) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
