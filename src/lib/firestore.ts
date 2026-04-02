import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type GAStream = {
  id?: string;
  userId: string;
  propertyId: string;
  streamName: string;
  websiteUrl: string;
  active: boolean;
  createdAt: number;
};

export type UserSettings = {
  theme: "light" | "dark" | "system";
  refreshInterval: number;
  defaultView: "all" | "single";
  visibleMetrics: Record<string, boolean>;
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  refreshInterval: 30,
  defaultView: "all",
  visibleMetrics: {
    activeUsers: true,
    pageviews: true,
    sessionDuration: true,
    bounceRate: true,
    trafficSources: true,
    topPages: true,
    geoMap: true,
    deviceBreakdown: true,
    events: false,
    conversions: false,
    newVsReturning: false,
    pageLoadTime: false,
  },
};

function getDb() {
  if (!db) throw new Error("Firebase not initialized");
  return db;
}

export async function getStreams(userId: string): Promise<GAStream[]> {
  const q = query(collection(getDb(), "streams"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GAStream));
}

export async function addStream(stream: Omit<GAStream, "id">): Promise<string> {
  const ref = await addDoc(collection(getDb(), "streams"), stream);
  return ref.id;
}

export async function updateStream(id: string, data: Partial<GAStream>) {
  await updateDoc(doc(getDb(), "streams", id), data);
}

export async function deleteStream(id: string) {
  await deleteDoc(doc(getDb(), "streams", id));
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const ref = doc(getDb(), "settings", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserSettings;
  await setDoc(ref, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveUserSettings(userId: string, settings: Partial<UserSettings>) {
  await setDoc(doc(getDb(), "settings", userId), settings, { merge: true });
}
