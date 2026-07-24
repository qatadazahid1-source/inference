import { supabase } from '../lib/supabase';

/**
 * Standardized API client for calling Supabase RPCs, mimicking standard REST calls.
 */
export async function fetchFromRPC<T>(rpcName: string, args: Record<string, any> = {}): Promise<T> {
  // @ts-ignore - Bypass strict type checking until types are regenerated
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    console.error(`API Error [${rpcName}]:`, error);
    throw new Error(error.message || 'Failed to fetch data');
  }
  return data as T;
}

export async function fetchFromTable<T>(tableName: string, queryBuilder: (query: any) => any): Promise<T[]> {
  // @ts-ignore - Bypass strict type checking until types are regenerated
  let query = supabase.from(tableName).select('*');
  query = queryBuilder(query);
  
  const { data, error } = await query;
  if (error) {
    console.error(`API Error [${tableName}]:`, error);
    throw new Error(error.message || 'Failed to fetch data');
  }
  return data as T[];
}
