import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetUsersMeOwnerWeightsQueryKey,
  useDeleteUsersMeOwnerWeightsOwnerWeightHistory,
  useGetUsersMeOwnerWeights,
  usePostUsersMeOwnerWeights,
  usePutUsersMeOwnerWeightsOwnerWeightHistory,
} from "@/api/generated/user-profile/user-profile";
import type { WeightHistory } from "@/api/generated/model";
import { useAuth } from "@/hooks/use-auth";

const EMPTY_WEIGHT_HISTORY: WeightHistory[] = [];

export interface UseOwnerWeightsResult {
  items: WeightHistory[];
  page: number;
  meta: unknown;
  links: unknown;
  loading: boolean;
  error: string | null;
  refresh: (page?: number) => Promise<void>;
  create: (payload: { weight_kg: number; record_date: string }) => Promise<WeightHistory>;
  update: (
    id: number,
    payload: Partial<{ weight_kg: number; record_date: string }>,
  ) => Promise<WeightHistory>;
  remove: (id: number) => Promise<boolean>;
}

export function useOwnerWeights(): UseOwnerWeightsResult {
  const queryClient = useQueryClient();
  const { loadUser } = useAuth();
  const [page, setPage] = useState(1);

  const params = { page };
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetUsersMeOwnerWeights(params, {
    query: { enabled: true },
  });

  const items = useMemo(() => queryData?.data ?? EMPTY_WEIGHT_HISTORY, [queryData]);
  const meta = queryData?.meta ?? null;
  const links = queryData?.links ?? null;
  const loading = isLoading;
  const error = isError ? "Failed to load owner weights" : null;

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: getGetUsersMeOwnerWeightsQueryKey(),
    });
  }, [queryClient]);

  const createMutation = usePostUsersMeOwnerWeights();
  const updateMutation = usePutUsersMeOwnerWeightsOwnerWeightHistory();
  const deleteMutation = useDeleteUsersMeOwnerWeightsOwnerWeightHistory();

  const refresh = useCallback(
    async (pg?: number) => {
      if (pg !== undefined) setPage(pg);
      await invalidate();
    },
    [invalidate],
  );

  const create = useCallback(
    async (payload: { weight_kg: number; record_date: string }) => {
      const item = await createMutation.mutateAsync({ data: payload });
      setPage(1);
      await invalidate();
      await loadUser();
      return item;
    },
    [createMutation, invalidate, loadUser],
  );

  const update = useCallback(
    async (id: number, payload: Partial<{ weight_kg: number; record_date: string }>) => {
      const item = await updateMutation.mutateAsync({
        ownerWeightHistory: id,
        data: payload,
      });
      await invalidate();
      await loadUser();
      return item;
    },
    [updateMutation, invalidate, loadUser],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ ownerWeightHistory: id });
      await invalidate();
      await loadUser();
      return true;
    },
    [deleteMutation, invalidate, loadUser],
  );

  return useMemo(
    () => ({
      items,
      page,
      meta,
      links,
      loading,
      error,
      refresh,
      create,
      update,
      remove,
    }),
    [items, page, meta, links, loading, error, refresh, create, update, remove],
  );
}
