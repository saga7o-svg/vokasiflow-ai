import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes: reuse fresh data during page transitions
        gcTime: 1000 * 60 * 10, // 10 minutes cache retention
        refetchOnWindowFocus: false, // Avoid redundant network bursts on tab focus
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 30, // Preload on hover/intent with 30s cache
  });

  return router;
};
