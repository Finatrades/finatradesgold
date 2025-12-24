import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'finatrades_cookie_consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = { necessary: true, functional: true, marketing: true };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(allAccepted));
    setShow(false);
  };

  const handleDeclineAll = () => {
    const onlyNecessary = { necessary: true, functional: false, marketing: false };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(onlyNecessary));
    setShow(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));
    setShow(false);
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                    <Cookie className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">You control your data</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      We use cookies to enhance your experience and analyze site traffic.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  By clicking "Accept all", you consent to our use of cookies. You can customize your preferences below.
                </p>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium mb-4"
                >
                  <Settings className="w-4 h-4" />
                  Customize settings
                  {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="space-y-3 py-3 border-t border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Necessary</p>
                            <p className="text-xs text-gray-500">Required for the website to function</p>
                          </div>
                          <Switch checked={true} disabled className="opacity-50" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Functional</p>
                            <p className="text-xs text-gray-500">Enhanced features and personalization</p>
                          </div>
                          <Switch
                            checked={preferences.functional}
                            onCheckedChange={(checked) => setPreferences(p => ({ ...p, functional: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Marketing</p>
                            <p className="text-xs text-gray-500">Personalized ads and analytics</p>
                          </div>
                          <Switch
                            checked={preferences.marketing}
                            onCheckedChange={(checked) => setPreferences(p => ({ ...p, marketing: checked }))}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDeclineAll}
                    className="flex-1 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Decline all
                  </Button>
                  {showSettings ? (
                    <Button
                      onClick={handleSaveSettings}
                      className="flex-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
                    >
                      Save settings
                    </Button>
                  ) : (
                    <Button
                      onClick={handleAcceptAll}
                      className="flex-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
                    >
                      Accept all
                    </Button>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-4 text-center">
                  <a href="/privacy-policy" className="hover:text-purple-600 underline">Read more about cookies</a>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!show && (
        <button
          onClick={() => setShow(true)}
          className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Cookie settings"
        >
          <Cookie className="w-5 h-5 text-purple-600" />
        </button>
      )}
    </>
  );
}
