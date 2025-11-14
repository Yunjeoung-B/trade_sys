import { useQuery } from "@tanstack/react-query";

interface CustomerRate {
  buyRate: number;
  sellRate: number;
  spread: number;
  baseRate: {
    buyRate: string;
    sellRate: string;
    source: string;
    updatedAt: string;
  } | null;
}

interface UseCustomerRateOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export function useCustomerRate(
  productType: string,
  currencyPairId: string | undefined,
  options?: UseCustomerRateOptions
) {
  const {
    refetchInterval = 10000, // Default 10s to match Infomax poller
    enabled = true,
  } = options || {};

  const query = useQuery<CustomerRate | null>({
    queryKey: ["/api/customer-rates", productType, currencyPairId],
    enabled: enabled && !!currencyPairId,
    refetchInterval,
    refetchIntervalInBackground: true,
    staleTime: 10000, // Consider data stale after 10s
  });

  return {
    buyRate: query.data?.buyRate,
    sellRate: query.data?.sellRate,
    spread: query.data?.spread,
    baseRate: query.data?.baseRate,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
