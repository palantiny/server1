import { useState, useEffect, useCallback } from 'react';
import { fetchCart } from '../api';

export function useCartCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const items = await fetchCart();
      setCount(items.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('cart-updated', refresh);
    return () => window.removeEventListener('cart-updated', refresh);
  }, [refresh]);

  return count;
}
