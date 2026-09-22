import {useState, useCallback} from 'react';
import {apiClient} from '../services/api-client';

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<T>(url);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const postData = useCallback(async (url: string, body: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(url, body);
      setData(response as T);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {data, loading, error, fetchData, postData};
}
