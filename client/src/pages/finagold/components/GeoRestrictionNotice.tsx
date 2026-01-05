import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeoRestrictionData {
  restricted: boolean;
  countryCode?: string;
  countryName?: string;
  message?: string;
  allowRegistration?: boolean;
  allowLogin?: boolean;
  allowTransactions?: boolean;
  showNotice?: boolean;
  blockAccess?: boolean;
}

export default function GeoRestrictionNotice() {
  const [restriction, setRestriction] = useState<GeoRestrictionData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRestriction = async () => {
      try {
        const res = await fetch('/api/geo-restriction/check');
        if (res.ok) {
          const data = await res.json();
          setRestriction(data);
        }
      } catch (error) {
        console.log('Failed to check geo restriction');
      } finally {
        setLoading(false);
      }
    };

    checkRestriction();
  }, []);

  if (loading || !restriction?.restricted || !restriction?.showNotice || dismissed) {
    return null;
  }

  if (restriction.blockAccess) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Service Unavailable
          </h2>
          <p className="text-gray-600 mb-4">
            {restriction.countryName && (
              <span className="block text-sm text-gray-500 mb-2">
                Detected location: {restriction.countryName}
              </span>
            )}
            {restriction.message || 'Our services are not available in your region.'}
          </p>
          <div className="text-sm text-gray-500">
            If you believe this is an error, please contact our support team.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-[90] bg-amber-500/95 text-amber-950 py-3 px-4 shadow-lg"
        data-testid="geo-restriction-notice"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              {restriction.countryName && (
                <span className="font-medium mr-2">
                  {restriction.countryName}:
                </span>
              )}
              <span>{restriction.message || 'Some services may be limited in your region.'}</span>
              {(restriction.allowRegistration || restriction.allowLogin) && (
                <span className="ml-2 text-xs opacity-80">
                  {restriction.allowRegistration && 'Registration available.'}
                  {restriction.allowLogin && ' Login available.'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-amber-600/30 rounded-full transition-colors"
            aria-label="Dismiss notice"
            data-testid="button-dismiss-geo-notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
