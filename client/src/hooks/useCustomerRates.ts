import { useQuery } from "@tanstack/react-query";
import type { CustomerRateItem } from "@shared/schema";

interface UseCustomerRatesOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export function useCustomerRates(
  productType: string | undefined,
  tenor?: string,
  options?: UseCustomerRatesOptions
) {
  const {
    refetchInterval = 10000,
    enabled = true,
  } = options || {};

  const query = useQuery<CustomerRateItem[]>({
    queryKey: ["/api/customer-rates", productType, tenor],
    queryFn: async () => {
      if (!productType) return [];
      
      // Build URL with optional tenor query parameter
      const url = new URL(`/api/customer-rates/${productType}`, window.location.origin);
      if (tenor) {
        url.searchParams.set('tenor', tenor);
      }
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customer rates');
      }
      return response.json();
    },
    enabled: enabled && !!productType,
    refetchInterval,
    refetchIntervalInBackground: true,
    staleTime: 10000,
  });

  return {
    customerRates: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
