import { useEffect, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'mira_mk_install_dismissed_until';
const DISMISS_DAYS = 14;

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isDismissed() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY)) > Date.now();
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [appleMobile] = useState(isAppleMobile);
  const [installed, setInstalled] = useState(isRunningStandalone);
  const [dismissed, setDismissed] = useState(isDismissed);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const closePrompt = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)); } catch {}
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  if (installed || dismissed || (!installEvent && !appleMobile)) return null;

  return (
    <aside className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-lg border border-steel-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:bottom-5 sm:right-5" role="region" aria-label="Installation de l'application" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          {appleMobile ? <Share2 className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-steel-900">Installer Boucherie Mira-Mk</h2>
          <p className="mt-1 text-sm leading-relaxed text-steel-600">Accédez plus rapidement à l'application depuis votre appareil.</p>
          {showInstructions && appleMobile && (
            <p className="mt-2 rounded-md bg-steel-50 p-2 text-sm text-steel-700">
              Dans Safari, touchez <strong>Partager</strong>, puis <strong>Sur l'écran d'accueil</strong> et confirmez.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {installEvent && <button type="button" className="btn-primary btn-sm" onClick={install}><Download className="h-4 w-4" /> Installer</button>}
            {appleMobile && <button type="button" className="btn-secondary btn-sm" onClick={() => setShowInstructions((value) => !value)}>{showInstructions ? 'Masquer les étapes' : 'Comment installer'}</button>}
            <button type="button" className="btn-ghost btn-sm" onClick={closePrompt}>Plus tard</button>
          </div>
        </div>
        <button type="button" className="btn-ghost btn-sm -mr-2 -mt-2" onClick={closePrompt} aria-label="Fermer l'invitation d'installation" title="Fermer"><X className="h-4 w-4" /></button>
      </div>
    </aside>
  );
}