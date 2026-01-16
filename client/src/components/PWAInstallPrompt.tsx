import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import finatradesLogo from '@/assets/finatrades-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = window.navigator.userAgent;
      const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
      
      setIsIOS(iOS);
      setIsStandalone(standalone);
    };

    checkDevice();

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    if (daysSinceDismissed < 7) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => {
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (iOS) {
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden max-w-md mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Install Finatrades</h3>
                <p className="text-white/80 text-xs">Add to your home screen</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="p-4">
            {isIOS ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={finatradesLogo} 
                    alt="Finatrades" 
                    className="w-12 h-12 rounded-xl"
                    style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(85%) saturate(4429%) hue-rotate(265deg) brightness(93%) contrast(99%)' }}
                  />
                  <div>
                    <p className="text-gray-700 text-sm font-medium">Get the full app experience</p>
                    <p className="text-gray-500 text-xs">Quick access from your home screen</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-gray-700 text-sm font-medium mb-3">How to install:</p>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">1</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-sm">Tap the</span>
                      <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                        <Share className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-gray-600 text-sm">Share button</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">2</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-sm">Scroll and tap</span>
                      <div className="flex items-center gap-1 bg-gray-200 rounded px-2 py-1">
                        <Plus className="w-3 h-3 text-gray-600" />
                        <span className="text-gray-600 text-xs font-medium">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">3</div>
                    <span className="text-gray-600 text-sm">Tap <strong>Add</strong> to confirm</span>
                  </div>
                </div>

                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-gray-200"
                >
                  Maybe Later
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={finatradesLogo} 
                    alt="Finatrades" 
                    className="w-12 h-12 rounded-xl"
                    style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(85%) saturate(4429%) hue-rotate(265deg) brightness(93%) contrast(99%)' }}
                  />
                  <div>
                    <p className="text-gray-700 text-sm font-medium">Get the full app experience</p>
                    <p className="text-gray-500 text-xs">Quick access from your home screen</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleInstall}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install App
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    className="h-12 px-6 rounded-xl border-gray-200"
                  >
                    Later
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
