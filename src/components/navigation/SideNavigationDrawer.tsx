/**
 * SideNavigationDrawer — RETIRED
 *
 * This component has been replaced by the single primary BottomNavbar.
 * The hamburger sidebar drawer pattern is incompatible with Signal Android's
 * clean bottom-navigation-only architecture adopted for NotiCatch.
 *
 * This file is kept as an empty stub to avoid import resolution errors
 * during any incremental migration period. All drawer-triggering imports
 * and usages have been removed from ChatsPage, SettingsPage, and App.tsx.
 *
 * @deprecated — Do not instantiate. Use BottomNavbar for navigation.
 */

export function SideNavigationDrawer(_props: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}): null {
  return null;
}
