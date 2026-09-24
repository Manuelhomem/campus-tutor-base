import { redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Simulated auth (no backend): accounts and session live in localStorage.
export type Account = {
  tipo?: "aluno" | "tutor";
  primeiroNome: string;
  ultimoNome: string;
  email: string;
  ano: string;
  curso: string;
  password: string;
  disciplinas?: string[];
  bio?: string;
  disponibilidade?: string[]; // "Dia|HH:00"
};

export type Booking = {
  subject: string;
  tutor: string;
  day: string;
  time: string;
  mode: string;
};

const ACCOUNTS_KEY = "tutoriscte:accounts";
const SESSION_KEY = "tutoriscte:session";
const bookingsKey = (email: string) => `tutoriscte:bookings:${email}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getAccounts(): Account[] {
  return read<Account[]>(ACCOUNTS_KEY, []);
}

export function registerAccount(acc: Account): boolean {
  const accounts = getAccounts();
  const email = acc.email.trim().toLowerCase();
  if (accounts.some((a) => a.email === email)) return false;
  accounts.push({ ...acc, email });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return true;
}

export function login(email: string, password: string): Account | null {
  const acc = getAccounts().find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );
  if (!acc) return null;
  localStorage.setItem(SESSION_KEY, acc.email);
  window.dispatchEvent(new Event("tutoriscte-auth"));
  return acc;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("tutoriscte-auth"));
}

export function getCurrentUser(): Account | null {
  const raw = typeof window === "undefined" ? null : localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  return getAccounts().find((a) => a.email === raw) ?? null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<Account | null>(null);
  useEffect(() => {
    const update = () => setUser(getCurrentUser());
    update();
    window.addEventListener("tutoriscte-auth", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tutoriscte-auth", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return user;
}

export function getBookings(email: string): Booking[] {
  return read<Booking[]>(bookingsKey(email), []);
}

export function addBooking(email: string, b: Booking) {
  const list = getBookings(email);
  list.push(b);
  localStorage.setItem(bookingsKey(email), JSON.stringify(list));
}

// Route guard: use with `ssr: false` so it runs in the browser.
export function requireLogin(href: string) {
  if (!getCurrentUser()) {
    throw redirect({ to: "/login", search: { redirect: href, motivo: "agendar" } });
  }
}
