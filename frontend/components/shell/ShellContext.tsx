"use client";

import { createContext, useContext, useState } from "react";

// Shared UI state between the app shell's sibling client components (TopHeader
// hamburger ↔ Sidebar drawer), provided by the server layout.
type ShellState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellState>({
  mobileNavOpen: false,
  setMobileNavOpen: () => {},
});

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return <ShellContext.Provider value={{ mobileNavOpen, setMobileNavOpen }}>{children}</ShellContext.Provider>;
}

export function useShell() {
  return useContext(ShellContext);
}
