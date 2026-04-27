import { useSyncExternalStore } from "react";
import type { Role } from "@/lib/types";

export interface DemoUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  password: string;
  role: Role;
  roleLabel: string;
  location: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u-site",
    name: "Anil Kumar",
    initials: "AK",
    email: "anil.kumar@rithwik.com",
    password: "site@123",
    role: "site",
    roleLabel: "Site Engineer",
    location: "BLR-01",
  },
  {
    id: "u-accounts",
    name: "Priya Sharma",
    initials: "PS",
    email: "priya.sharma@rithwik.com",
    password: "accounts@123",
    role: "accounts",
    roleLabel: "Accounts (HO)",
    location: "Finance · HO",
  },
  {
    id: "u-mgmt",
    name: "Rajesh Menon",
    initials: "RM",
    email: "rajesh.menon@rithwik.com",
    password: "mgmt@123",
    role: "management",
    roleLabel: "Management",
    location: "Operations · HO",
  },
  {
    id: "u-admin",
    name: "System Admin",
    initials: "SA",
    email: "admin@rithwik.com",
    password: "admin@123",
    role: "admin",
    roleLabel: "System Admin",
    location: "IT · HO",
  },
];

const STORAGE_KEY = "dmr.auth.user";
const EVENT = "dmr-auth-changed";

export type StoredUser = Omit<DemoUser, "password">;

function read(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function write(u: StoredUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function getCurrentUser(): StoredUser | null {
  return read();
}

export function signIn(email: string, password: string): StoredUser | null {
  const match = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
  );
  if (!match) return null;
  const { password: _pw, ...stored } = match;
  write(stored);
  return stored;
}

export function signInAs(userId: string): StoredUser | null {
  const match = DEMO_USERS.find((u) => u.id === userId);
  if (!match) return null;
  const { password: _pw, ...stored } = match;
  write(stored);
  return stored;
}

export function signOut() {
  write(null);
}

const subscribe = (cb: () => void) => {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

export function useCurrentUser(): StoredUser | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
