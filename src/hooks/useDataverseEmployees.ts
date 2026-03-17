/**
 * useDataverseEmployees Hook
 * Provides access to Dataverse employee data across components
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchDataverseData, transformDataverseData, type DataverseData } from '../data/dataverseLoader';
import type { Employee } from '../types';

export interface UseDataverseEmployeesResult {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  rawData: DataverseData | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage Dataverse employee data
 * @param isInitialized - Whether the Power Platform SDK is initialized
 */
export function useDataverseEmployees(isInitialized: boolean = true): UseDataverseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<DataverseData | null>(null);

  const loadData = useCallback(async () => {
    if (!isInitialized) {
      setError('common.sdkNotInitialized');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await fetchDataverseData();
      const transformed = transformDataverseData(data);

      setEmployees(transformed.employees);
      setRawData(data);

      console.log('Dataverse employees loaded:', {
        totalEmployees: transformed.employees.length,
        rawEmployees: data.employees.length,
        shiftGroups: data.shiftGroups.length,
        shiftPlans: data.shiftPlans.length,
        attendanceRecords: data.attendanceRecords.length
      });
    } catch (err) {
      console.error('Failed to load Dataverse employees:', err);
      setError(err instanceof Error ? err.message : 'common.dataverseLoadFailed');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    employees,
    isLoading,
    error,
    rawData,
    refetch: loadData
  };
}
