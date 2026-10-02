import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, promptInstall } from "./pwaInstall";

/**
 * Reactive view of Learnova's install state. Every consumer reads the same
 * module singleton, so PublicHome, HamburgerDrawer, etc. always agree.
 *
 * canInstall   true only while a usable browser install prompt is held
 *              (never in unsupported browsers, when already installed, or
 *              after the user dismissed the dialog this session)
 * isInstalled  running standalone, or installed during this page load
 * promptInstall() -> "accepted" | "dismissed" | "unavailable" | "error";
 *              call it only from a click/tap handler
 */
export function usePwaInstall() {
  const { canInstall, isInstalled } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { canInstall, isInstalled, promptInstall };
}
