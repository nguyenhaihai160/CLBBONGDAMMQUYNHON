import { Download, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('fam_install_banner_dismissed') === '1');
  const [standalone, setStandalone] = useState(false);

  const ios = useMemo(() => isIOSDevice(), []);

  useEffect(() => {
    setStandalone(isStandaloneMode());

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      localStorage.removeItem('fam_install_banner_dismissed');
      setDismissed(false);
    };

    const handleInstalled = () => {
      setStandalone(true);
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (standalone || dismissed) return null;

  const canInstallAndroid = Boolean(deferredPrompt);
  const shouldShowIOSGuide = ios && !canInstallAndroid;
  if (!canInstallAndroid && !shouldShowIOSGuide) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const close = () => {
    localStorage.setItem('fam_install_banner_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-4 z-[80] mx-auto max-w-xl rounded-3xl border border-white/30 bg-brandForest/95 p-4 text-white shadow-2xl backdrop-blur app-safe-bottom sm:bottom-6">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-brandForest">
          <Smartphone size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black">Cài thành app điện thoại</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {shouldShowIOSGuide
                  ? 'Trên iPhone: bấm nút Chia sẻ trong Safari → Thêm vào Màn hình chính.'
                  : 'Cài app để mở nhanh từ màn hình chính, trải nghiệm như ứng dụng riêng.'}
              </p>
            </div>
            <button onClick={close} className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Đóng gợi ý cài app">
              <X size={18} />
            </button>
          </div>
          {canInstallAndroid && (
            <button onClick={install} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-orange-400 px-4 py-2 text-sm font-black text-brandForest active:scale-[0.98]">
              <Download size={16} /> Cài app ngay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
