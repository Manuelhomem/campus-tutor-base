import { redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Modo = "Presencial" | "Online" | "Ambas";

export type Account = {
  id?: string;
  tipo?: "aluno" | "tutor";
  primeiroNome: string;
  ultimoNome: string;
  email: string;
  ano: string;
  curso: string;
  password?: string;
  disciplinas?: string[];
  bio?: string;
  disponibilidade?: string[]; // "Dia|HH:00"
  disponibilidadeModo?: Record<string, Modo>;
};

export type Booking = {
  subject: string;
  tutor: string;
  day: string;
  time: string;
  mode: string;
  student?: string;
  studentEmail?: string;
  tutorEmail?: string;
  tutorId?: string;
  studentId?: string;
  createdAt?: string;
};

type ProfileRow = {
  id: string;
  email: string;
  primeiro_nome: string;
  ultimo_nome: string;
  ano: string;
  curso: string;
  tipo: string;
  bio: string | null;
  disciplinas: string[];
  disponibilidade: string[];
  disponibilidade_modo: unknown;
};

const STORAGE_KEYS = {
  CURRENT_USER: "tutoriscte_current_user",
  ACCOUNTS: "tutoriscte_accounts",
  BOOKINGS: "tutoriscte_bookings",
};

const cache: {
  user: Account | null;
  tutors: Account[];
  myBookings: Booking[];
  tutorSessions: Booking[];
} = { user: null, tutors: [], myBookings: [], tutorSessions: [] };

function getLocalAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccount(acc: Account) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalAccounts();
    const idx = list.findIndex((a) => a.email.toLowerCase() === acc.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...acc };
    } else {
      list.push(acc);
    }
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save local account", e);
  }
}

function getLocalBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBooking(b: Booking) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalBookings();
    list.push(b);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save local booking", e);
  }
}

function getLocalCurrentUser(): Account | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalCurrentUser(user: Account | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error("Failed to set local current user", e);
  }
}

function toAccount(p: ProfileRow): Account {
  return {
    id: p.id,
    tipo: p.tipo === "tutor" ? "tutor" : "aluno",
    primeiroNome: p.primeiro_nome,
    ultimoNome: p.ultimo_nome,
    email: p.email,
    ano: p.ano,
    curso: p.curso,
    ...(p.bio ? { bio: p.bio } : {}),
    disciplinas: p.disciplinas ?? [],
    disponibilidade: p.disponibilidade ?? [],
    disponibilidadeModo: (p.disponibilidade_modo ?? {}) as Record<string, Modo>,
  };
}

function profileFromAccount(id: string, a: Account) {
  return {
    id,
    email: a.email,
    primeiro_nome: a.primeiroNome,
    ultimo_nome: a.ultimoNome,
    ano: a.ano,
    curso: a.curso,
    tipo: a.tipo ?? "aluno",
    bio: a.bio ?? null,
    disciplinas: a.disciplinas ?? [],
    disponibilidade: a.disponibilidade ?? [],
    disponibilidade_modo: a.disponibilidadeModo ?? {},
  };
}

async function loadProfile(): Promise<Account | null> {
  // 1. Try Supabase session
  try {
    const { data: sess } = await supabase.auth.getSession();
    const authUser = sess.session?.user;
    if (authUser) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      if (data) {
        cache.user = toAccount(data as ProfileRow);
        setLocalCurrentUser(cache.user);
        return cache.user;
      }
      const meta = authUser.user_metadata?.["account"] as Account | undefined;
      if (meta) {
        const row = profileFromAccount(authUser.id, {
          ...meta,
          email: authUser.email ?? meta.email,
        });
        const { data: created } = await supabase.from("profiles").insert(row).select("*").single();
        if (created) {
          cache.user = toAccount(created as ProfileRow);
          setLocalCurrentUser(cache.user);
          return cache.user;
        }
      }
    }
  } catch (e) {
    console.warn("Supabase session check skipped or failed", e);
  }

  // 2. Fall back to local storage session
  const localUser = getLocalCurrentUser();
  if (localUser) {
    cache.user = localUser;
    return cache.user;
  }

  cache.user = null;
  return null;
}

export async function loadAll() {
  const user = await loadProfile();
  if (!user) return null;

  // Remote data from Supabase
  let remoteTutors: Account[] = [];
  let remoteBookings: Booking[] = [];
  try {
    const [{ data: tutors }, { data: bookings }] = await Promise.all([
      supabase.from("profiles").select("*").eq("tipo", "tutor"),
      supabase.from("bookings").select("*").order("created_at"),
    ]);
    if (tutors) {
      remoteTutors = (tutors ?? []).map((t) => toAccount(t as ProfileRow));
    }
    if (bookings) {
      const rows = bookings ?? [];
      remoteBookings = rows.map((b) => ({
        subject: b.subject,
        tutor: b.tutor_name,
        day: b.day,
        time: b.time,
        mode: b.mode,
        student: b.student_name,
        tutorId: b.tutor_id ?? undefined,
        studentId: b.student_id,
      }));
    }
  } catch (e) {
    console.warn("Supabase loadAll failed or offline", e);
  }

  // Merge with local accounts
  const localAccounts = getLocalAccounts();
  const allTutorsMap = new Map<string, Account>();
  for (const t of remoteTutors) {
    allTutorsMap.set(t.email.toLowerCase(), t);
  }
  for (const a of localAccounts) {
    if (a.tipo === "tutor") {
      const existing = allTutorsMap.get(a.email.toLowerCase());
      allTutorsMap.set(a.email.toLowerCase(), { ...existing, ...a });
    }
  }
  cache.tutors = Array.from(allTutorsMap.values());

  // Merge local bookings
  const localBookings = getLocalBookings();
  const allBookings = [...remoteBookings, ...localBookings];

  // Filter for student
  const studentFullName = `${user.primeiroNome} ${user.ultimoNome}`.toLowerCase();
  cache.myBookings = allBookings.filter(
    (b) =>
      (b.studentEmail && b.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
      (b.studentId && b.studentId === user.id) ||
      (b.student && b.student.toLowerCase() === studentFullName),
  );

  // Filter for tutor
  const tutorFullName = `${user.primeiroNome} ${user.ultimoNome}`.toLowerCase();
  cache.tutorSessions = allBookings.filter(
    (b) =>
      (b.tutorEmail && b.tutorEmail.toLowerCase() === user.email.toLowerCase()) ||
      (b.tutorId && b.tutorId === user.id) ||
      (b.tutor && b.tutor.toLowerCase() === tutorFullName),
  );

  return user;
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tutoriscte-auth"));
  }
}

export function getAccounts(): Account[] {
  const localTutors = getLocalAccounts().filter((a) => a.tipo === "tutor");
  const map = new Map<string, Account>();
  for (const t of cache.tutors) {
    map.set(t.email.toLowerCase(), t);
  }
  for (const t of localTutors) {
    const existing = map.get(t.email.toLowerCase());
    map.set(t.email.toLowerCase(), { ...existing, ...t });
  }
  return Array.from(map.values());
}

export async function registerAccount(
  acc: Account,
  redirectPath = "/dashboard",
): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> {
  const email = acc.email.trim().toLowerCase();
  const id = acc.id ?? crypto.randomUUID();
  const completeAccount: Account = {
    ...acc,
    id,
    email,
  };

  const localAccounts = getLocalAccounts();
  const existingLocal = localAccounts.find((a) => a.email.toLowerCase() === email);
  if (existingLocal) {
    return { ok: false, error: "Já existe uma conta com este email." };
  }

  // Save to persistent storage and log user in
  saveLocalAccount(completeAccount);
  setLocalCurrentUser(completeAccount);
  cache.user = completeAccount;
  if (completeAccount.tipo === "tutor") {
    if (!cache.tutors.some((t) => t.email.toLowerCase() === email)) {
      cache.tutors = [...cache.tutors, completeAccount];
    }
  }

  // Attempt Supabase sign up in background
  try {
    const { password, ...rest } = completeAccount;
    const accountData = { ...rest, email };
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password ?? "",
      options: {
        emailRedirectTo: `${window.location.origin}${redirectPath}`,
        data: { account: accountData },
      },
    });

    if (error && /already/i.test(error.message)) {
      // If Supabase already has this email and wasn't local
    } else if (data?.session?.user) {
      completeAccount.id = data.session.user.id;
      setLocalCurrentUser(completeAccount);
      saveLocalAccount(completeAccount);
      const row = profileFromAccount(data.session.user.id, completeAccount);
      await supabase.from("profiles").upsert(row);
    }
  } catch (e) {
    console.warn("Supabase signUp background error", e);
  }

  await loadAll();
  notify();
  return { ok: true };
}

export async function login(emailRaw: string, password: string): Promise<Account | null> {
  const email = emailRaw.trim().toLowerCase();

  // 1. Try Supabase
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session?.user) {
      const user = await loadAll();
      notify();
      return user;
    }
  } catch (e) {
    console.warn("Supabase login skipped or failed", e);
  }

  // 2. Try Local Accounts
  const localAccounts = getLocalAccounts();
  const acc = localAccounts.find(
    (a) => a.email.toLowerCase() === email && (!a.password || a.password === password),
  );

  if (acc) {
    cache.user = acc;
    setLocalCurrentUser(acc);
    await loadAll();
    notify();
    return acc;
  }

  return null;
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Supabase signOut error", e);
  }
  setLocalCurrentUser(null);
  cache.user = null;
  cache.myBookings = [];
  cache.tutorSessions = [];
  notify();
}

export function getCurrentUser(): Account | null {
  if (!cache.user) {
    cache.user = getLocalCurrentUser();
  }
  return cache.user;
}

export function useCurrentUser() {
  const [user, setUser] = useState<Account | null>(getCurrentUser());
  useEffect(() => {
    const update = () => setUser(getCurrentUser());
    loadAll().then(update);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => loadAll().then(update), 0);
    });
    window.addEventListener("tutoriscte-auth", update);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("tutoriscte-auth", update);
    };
  }, []);
  return user;
}

export function getBookings(email?: string): Booking[] {
  const targetEmail = (email ?? cache.user?.email)?.toLowerCase();
  const userName = cache.user
    ? `${cache.user.primeiroNome} ${cache.user.ultimoNome}`.toLowerCase()
    : "";
  const local = getLocalBookings();
  const all = [...cache.myBookings, ...local];
  const seen = new Set<string>();
  const res: Booking[] = [];
  for (const b of all) {
    const matches =
      (targetEmail && b.studentEmail?.toLowerCase() === targetEmail) ||
      (userName && b.student?.toLowerCase() === userName);
    if (matches) {
      const key = `${b.subject}|${b.day}|${b.time}|${b.tutor}|${b.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(b);
      }
    }
  }
  return res;
}

export function getTutorSessions(tutor?: Account): Booking[] {
  const t = tutor ?? cache.user;
  if (!t) return [];
  const local = getLocalBookings();
  const all = [...cache.tutorSessions, ...local];
  const seen = new Set<string>();
  const res: Booking[] = [];
  const tutorFullName = `${t.primeiroNome} ${t.ultimoNome}`.toLowerCase();
  for (const b of all) {
    const matches =
      (b.tutorEmail && b.tutorEmail.toLowerCase() === t.email.toLowerCase()) ||
      (b.tutorId && b.tutorId === t.id) ||
      (b.tutor && b.tutor.toLowerCase() === tutorFullName);
    if (matches) {
      const key = `${b.subject}|${b.day}|${b.time}|${b.student}|${b.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(b);
      }
    }
  }
  return res;
}

export async function addBooking(_email: string, b: Booking) {
  const user = getCurrentUser();
  if (!user) return;
  const tutors = getAccounts();
  const matchedTutor = tutors.find(
    (t) =>
      (b.tutorEmail && t.email.toLowerCase() === b.tutorEmail.toLowerCase()) ||
      `${t.primeiroNome} ${t.ultimoNome}`.toLowerCase() === b.tutor.toLowerCase(),
  );

  const fullBooking: Booking = {
    ...b,
    student: b.student ?? `${user.primeiroNome} ${user.ultimoNome}`,
    studentEmail: user.email,
    studentId: user.id,
    tutorEmail: b.tutorEmail ?? matchedTutor?.email,
    tutorId: matchedTutor?.id,
    createdAt: new Date().toISOString(),
  };

  saveLocalBooking(fullBooking);
  cache.myBookings = [...cache.myBookings, fullBooking];
  cache.tutorSessions = [...cache.tutorSessions, fullBooking];

  try {
    await supabase.from("bookings").insert({
      student_id: user.id ?? null,
      student_name: fullBooking.student!,
      tutor_id: matchedTutor?.id ?? null,
      tutor_name: fullBooking.tutor,
      subject: fullBooking.subject,
      day: fullBooking.day,
      time: fullBooking.time,
      mode: fullBooking.mode,
    });
  } catch (e) {
    console.warn("Supabase addBooking insert warning", e);
  }

  notify();
}

// Route guard: use with `ssr: false` so it runs in the browser.
export async function requireLogin(href: string, motivo: string = "agendar") {
  const user = await loadAll();
  if (!user) {
    throw redirect({ to: "/login", search: { redirect: href, motivo: motivo || undefined } });
  }
}
