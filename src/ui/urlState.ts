import { useCallback, useEffect, useState } from 'react';

/** Tab, seed and options live in the URL hash so any result can be shared and reproduced. */
export type UrlState = Record<string, string>;

const read = (): UrlState => Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)));

export function useUrlState(): [UrlState, (patch: UrlState, replace?: boolean) => void] {
  const [state, setState] = useState<UrlState>(read);

  useEffect(() => {
    const onHash = () => setState(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const update = useCallback((patch: UrlState, replace = false) => {
    const next = { ...(replace ? {} : read()), ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== ''));
    window.history.replaceState(null, '', `#${new URLSearchParams(clean)}`);
    setState(clean);
  }, []);

  return [state, update];
}
