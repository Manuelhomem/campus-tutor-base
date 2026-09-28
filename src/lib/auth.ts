import { redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Accounts, tutor availability and bookings live in Lovable Cloud.
// Route guards (`requireLogin`) load the signed-in user's data into an
// in-memory cache so pages can read it synchronously.
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

const cache: {
  user: Account | null;
  tutors: Account[];
  myBookings: Booking[];
  tutorSessions: Booking[];
} = { user: null, tutors: [], myBookings: [], tutorSessions: [] };

function toAccount(p: ProfileRow): Account {
  return {
    id: p.id,
    tipo: p.tipo === "tutor" ? "tutor" : "aluno",
    primeiroNome: p.primeiro_nome,
    ultimoNome: p.ultimo_nome,
    email: p.email,
    ano: p.ano,
    curso: p.curso,
    bio: p.bio ?? undefined,
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
  const { data: sess } = await supabase.auth.getSession();
  const authUser = sess.session?.user;
  if (!authUser) {
    cache.user = null;
    return null;
  }
  const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
  if (data) {
    cache.user = toAccount(data as ProfileRow);
    return cache.user;
  }
  // First sign-in after email confirmation: create the profile from sign-up data.
  const meta = authUser.user_metadata?.account as Account | undefined;
  if (!meta) {
    cache.user = null;
    return null;
  }
  const row = profileFromAccount(authUser.id, { ...meta, email: authUser.email ?? meta.email });
  const { data: created } = await supabase.from("profiles").insert(row).select("*").single();
  cache.user = created ? toAccount(created as ProfileRow) : null;
  return cache.user;
}

async function loadAll() {
  const user = await loadProfile();
  if (!user) return null;
  const [{ data: tutors }, { data: bookings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("tipo", "tutor"),
    supabase.from("bookings").select("*").order("created_at"),
  ]);
  cache.tutors = (tutors ?? []).map((t) => toAccount(t as ProfileRow));
  const rows = bookings ?? [];
  const toBooking = (b: (typeof rows)[number]): Booking => ({
    subject: b.subject,
    tutor: b.tutor_name,
    day: b.day,
    time: b.time,
    mode: b.mode,
    student: b.student_name,
  });
  cache.myBookings = rows.filter((b) => b.student_id === user.id).map(toBooking);
  cache.tutorSessions = rows.filter((b) => b.tutor_id === user.id).map(toBooking);
  return user;
}

function notify() {
  window.dispatchEvent(new Event("tutoriscte-auth"));
}

export function getAccounts(): Account[] {
  return cache.tutors;
}

export async function registerAccount(
  acc: Account,
  redirectPath = "/dashboard",
): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> {
  const email = acc.email.trim().toLowerCase();
  const { password, ...rest } = acc;
  const account = { ...rest, email };
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password ?? "",
    options: {
      emailRedirectTo: `${window.location.origin}${redirectPath}`,
      data: { account },
    },
  });
  if (error) {
    const exists = /already/i.test(error.message);
    return { ok: false, error: exists ? "Já existe uma conta com este email." : error.message };
  }
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "Já existe uma conta com este email." };
  }
  if (!data.session) return { ok: true, needsConfirmation: true };
  await loadAll();
  notify();
  return { ok: true };
}

export async function login(email: string, password: string): Promise<Account | null> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return null;
  const user = await loadAll();
  notify();
  return user;
}

export async function logout() {
  await supabase.auth.signOut();
  cache.user = null;
  cache.myBookings = [];
  cache.tutorSessions = [];
  notify();
}

export function getCurrentUser(): Account | null {
  return cache.user;
}

export function useCurrentUser() {
  const [user, setUser] = useState<Account | null>(cache.user);
  useEffect(() => {
    const update = () => setUser(cache.user);
    loadProfile().then(update);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => loadProfile().then(update), 0);
    });
    window.addEventListener("tutoriscte-auth", update);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("tutoriscte-auth", update);
    };
  }, []);
  return user;
}

export function getBookings(_email?: string): Booking[] {
  return cache.myBookings;
}

export function getTutorSessions(_tutor?: Account): Booking[] {
  return cache.tutorSessions;
}

export async function addBooking(_email: string, b: Booking) {
  const user = cache.user;
  if (!user?.id) return;
  const tutorId = b.tutorEmail ? cache.tutors.find((t) => t.email === b.tutorEmail)?.id : undefined;
  cache.myBookings = [...cache.myBookings, b];
  await supabase.from("bookings").insert({
    student_id: user.id,
    student_name: b.student ?? `${user.primeiroNome} ${user.ultimoNome}`,
    tutor_id: tutorId ?? null,
    tutor_name: b.tutor,
    subject: b.subject,
    day: b.day,
    time: b.time,
    mode: b.mode,
  });
}

// Route guard: use with `ssr: false` so it runs in the browser.
export async function requireLogin(href: string) {
  const user = await loadAll();
  if (!user) {
    throw redirect({ to: "/login", search: { redirect: href, motivo: "agendar" } });
  }
}
