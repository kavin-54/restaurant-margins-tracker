"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, QueryConstraint, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase/config";
import { auth } from "@/lib/firebase/config";

// Convert Firestore Timestamps to JS Dates recursively
function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Timestamp) return obj.toDate();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);

  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertTimestamps(obj[key]);
    }
  }
  return result;
}

// Wait for Firebase Auth to have a current user before making Firestore calls
function waitForAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
}

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCollection<T>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const constraintKey = useMemo(() => {
    try {
      return constraints.map(c => {
        const str = String(c);
        return str !== "[object Object]" ? str : (c.constructor?.name || "Constraint");
      }).join("|");
    } catch {
      return "base-query";
    }
  }, [constraints]);

  const refetch = useCallback(() => setFetchCount(n => n + 1), []);

  useEffect(() => {
    if (!collectionPath) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const t0 = performance.now();
    console.log(`[⏱ Firestore] useCollection("${collectionPath}") — starting fetch`);

    async function fetchData() {
      try {
        // Wait for auth to be ready so Firestore requests include the auth token
        const hasUser = await waitForAuth();
        const tAuth = performance.now();
        console.log(`[⏱ Firestore] useCollection("${collectionPath}") — auth ready in ${(tAuth - t0).toFixed(1)}ms (user=${hasUser}, uid=${auth.currentUser?.uid || "null"})`);
        if (cancelled) return;

        if (!hasUser) {
          console.warn(`[⏱ Firestore] useCollection("${collectionPath}") — NO USER, skipping fetch`);
          setData([]);
          return;
        }

        const collectionRef = collection(db, collectionPath);
        const q = query(collectionRef, ...constraints);
        console.log(`[⏱ Firestore] useCollection("${collectionPath}") — calling getDocs...`);

        const snapshot = await getDocs(q);
        const tDocs = performance.now();
        console.log(`[⏱ Firestore] useCollection("${collectionPath}") — getDocs returned ${snapshot.size} docs in ${(tDocs - tAuth).toFixed(1)}ms (total ${(tDocs - t0).toFixed(1)}ms)`);
        if (cancelled) return;

        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...convertTimestamps(d.data()),
        } as T));
        setData(docs);
        setError(null);
      } catch (err) {
        const tErr = performance.now();
        console.error(`[⏱ Firestore] useCollection("${collectionPath}") — ERROR in ${(tErr - t0).toFixed(1)}ms:`, err instanceof Error ? err.message : err);
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log(`[⏱ Firestore] useCollection("${collectionPath}") — done, loading=false at ${(performance.now() - t0).toFixed(1)}ms`);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, constraintKey, fetchCount]);

  return { data, loading, error, refetch };
}

export function useDocument<T>(
  collectionPath: string,
  docId: string
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount(n => n + 1), []);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const t0 = performance.now();
    console.log(`[⏱ Firestore] useDocument("${collectionPath}/${docId}") — starting fetch`);

    async function fetchData() {
      try {
        const hasUser = await waitForAuth();
        const tAuth = performance.now();
        console.log(`[⏱ Firestore] useDocument("${collectionPath}/${docId}") — auth ready in ${(tAuth - t0).toFixed(1)}ms (user=${hasUser})`);
        if (cancelled) return;

        if (!hasUser) {
          console.warn(`[⏱ Firestore] useDocument("${collectionPath}/${docId}") — NO USER, skipping fetch`);
          setData(null);
          return;
        }

        const docRef = doc(db, collectionPath, docId);
        const snapshot = await getDoc(docRef);
        const tDoc = performance.now();
        console.log(`[⏱ Firestore] useDocument("${collectionPath}/${docId}") — getDoc returned exists=${snapshot.exists()} in ${(tDoc - tAuth).toFixed(1)}ms (total ${(tDoc - t0).toFixed(1)}ms)`);
        if (cancelled) return;

        if (snapshot.exists()) {
          setData({
            id: snapshot.id,
            ...convertTimestamps(snapshot.data()),
          } as T);
        } else {
          setData(null);
        }
        setError(null);
      } catch (err) {
        const tErr = performance.now();
        console.error(`[⏱ Firestore] useDocument("${collectionPath}/${docId}") — ERROR in ${(tErr - t0).toFixed(1)}ms:`, err instanceof Error ? err.message : err);
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log(`[⏱ Firestore] useDocument("${collectionPath}/${docId}") — done, loading=false at ${(performance.now() - t0).toFixed(1)}ms`);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [collectionPath, docId, fetchCount]);

  return { data, loading, error, refetch };
}
