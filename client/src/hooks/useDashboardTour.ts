import { useEffect } from 'react';
import { useTour, type TourStep } from '@/components/tour/TourProvider';

const DASHBOARD_TOUR_ID = 'dashboard-tour';

const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-testid="quick-actions-container"]',
    title: 'Quick Actions',
    content: 'Access common actions like adding funds, buying gold, sending payments, or requesting money from here.',
    placement: 'bottom',
    spotlightPadding: 16,
  },
  {
    target: '[data-testid="banner-settlement-assurance"]',
    title: 'Settlement Guarantee',
    content: 'Your gold is backed by over $42 billion in verified geological gold reserves. Click to learn more about our assurance.',
    placement: 'bottom',
  },
  {
    target: '[data-testid="sidebar-link-finapay"]',
    title: 'FinaPay Wallet',
    content: 'Your digital gold wallet. Buy, sell, send, and receive gold instantly with FinaPay.',
    placement: 'right',
  },
  {
    target: '[data-testid="sidebar-link-finavault"]',
    title: 'FinaVault Storage',
    content: 'View your gold certificates and proof of ownership. Your gold is stored in secure Swiss vaults.',
    placement: 'right',
  },
  {
    target: '[data-testid="sidebar-link-bnsl"]',
    title: 'Buy Now, Sell Later',
    content: "Lock in today's gold price and sell at a future date. Perfect for planning ahead and securing profits!",
    placement: 'right',
  },
  {
    target: '[data-testid="sidebar-link-profile"]',
    title: 'Your Profile',
    content: 'View and update your personal information, account settings, and preferences.',
    placement: 'right',
  },
  {
    target: '[data-testid="sidebar-link-security"]',
    title: 'Security Settings',
    content: 'Enable two-factor authentication, manage login sessions, and keep your account secure.',
    placement: 'right',
  },
];

export function useDashboardTour() {
  const tour = useTour();

  useEffect(() => {
    tour.registerTour(DASHBOARD_TOUR_ID, DASHBOARD_TOUR_STEPS);
  }, [tour]);

  return {
    startTour: () => tour.startTour(DASHBOARD_TOUR_ID),
    hasCompleted: tour.hasCompletedTour(DASHBOARD_TOUR_ID),
    tourId: DASHBOARD_TOUR_ID,
  };
}
