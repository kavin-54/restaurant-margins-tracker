"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, QueryConstraint, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// Convert Firestore Timestamps to JS Dates recursively
function convertTimestamps(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = convertTimestamps(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useCollection<T>(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log(`[Firestore] useCollection("${collectionPath}") subscribing`);
    console.time(`[Firestore] useCollection("${collectionPath}") first snapshot`);

    // Safety timeout — stop loading after 2 seconds even if Firestore hasn't responded
    const timeout = setTimeout(() => {
      console.warn(`[Firestore] useCollection("${collectionPath}") TIMEOUT: no response in 2s`);
      setLoading(false);
    }, 2000);

    let unsubscribe: () => void;

    try {
      const collectionRef = collection(db, collectionPath);
      const q = query(collectionRef, ...constraints);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          clearTimeout(timeout);
          console.timeEnd(`[Firestore] useCollection("${collectionPath}") first snapshot`);
          try {
            const docs = snapshot.docs.map((d) => ({
              id: d.id,
              ...convertTimestamps(d.data() as Record<string, unknown>),
            } as T));
            console.log(`[Firestore] useCollection("${collectionPath}") got ${docs.length} docs`);
            setData(docs);
            setError(null);
          } catch (err) {
            console.error(`[Firestore] useCollection("${collectionPath}") parse error:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timeout);
          console.error(`[Firestore] useCollection("${collectionPath}") error:`, err.code, err.message);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      console.error(`[Firestore] useCollection("${collectionPath}") setup failed:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      return;
    }

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [collectionPath]);

  return { data, loading, error };
}

export function useDocument<T>(
  collectionPath: string,
  docId: string
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    console.log(`[Firestore] useDocument("${collectionPath}/${docId}") subscribing`);
    console.time(`[Firestore] useDocument("${collectionPath}/${docId}") first snapshot`);

    // Safety timeout
    const timeout = setTimeout(() => {
      console.warn(`[Firestore] useDocument("${collectionPath}/${docId}") TIMEOUT: no response in 2s`);
      setLoading(false);
    }, 2000);

    let unsubscribe: () => void;

    try {
      const docRef = doc(db, collectionPath, docId);

      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          clearTimeout(timeout);
          console.timeEnd(`[Firestore] useDocument("${collectionPath}/${docId}") first snapshot`);
          try {
            if (snapshot.exists()) {
              console.log(`[Firestore] useDocument("${collectionPath}/${docId}") doc found`);
              setData({
                id: snapshot.id,
                ...convertTimestamps(snapshot.data() as Record<string, unknown>),
              } as T);
            } else {
              console.log(`[Firestore] useDocument("${collectionPath}/${docId}") doc not found`);
              setData(null);
            }
            setError(null);
          } catch (err) {
            console.error(`[Firestore] useDocument("${collectionPath}/${docId}") parse error:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timeout);
          console.error(`[Firestore] useDocument("${collectionPath}/${docId}") error:`, err.code, err.message);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      console.error(`[Firestore] useDocument("${collectionPath}/${docId}") setup failed:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      return;
    }

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [collectionPath, docId]);

  return { data, loading, error };
}
