import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed left-1/2 top-3 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900 shadow-lg">
      <WifiOff size={15} /> Mất kết nối mạng
    </div>
  );
}
