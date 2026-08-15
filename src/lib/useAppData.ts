import { useEffect, useState } from 'react';
import { loadData } from './storage';
import type { AppData } from '../types';

/** Recharge AppData quand le cloud (ou une autre page) met à jour le stockage. */
export function useAppData(): [AppData, (data: AppData) => void] {
  const [data, setData] = useState(() => loadData());

  useEffect(() => {
    function refresh() {
      setData(loadData());
    }
    window.addEventListener('sportivis-data', refresh);
    return () => window.removeEventListener('sportivis-data', refresh);
  }, []);

  return [data, setData];
}
