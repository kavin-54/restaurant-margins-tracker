"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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
    // Safety timeout — stop loading after 5 seconds even if Firestore hasn't responded
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    let unsubscribe: () => void;

    try {
      const collectionRef = collection(db, collectionPath);
      const q = query(collectionRef, ...constraints);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          clearTimeout(timeout);
          try {
            const docs = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            } as T));
            setData(docs);
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timeout);
          console.warn(`Firestore error on ${collectionPath}:`, err.message);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`Failed to set up listener for ${collectionPath}:`, err);
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

    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    let unsubscribe: () => void;

    try {
      const docRef = doc(db, collectionPath, docId);

      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          clearTimeout(timeout);
          try {
            if (snapshot.exists()) {
              setData({
                id: snapshot.id,
                ...snapshot.data(),
              } as T);
            } else {
              setData(null);
            }
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timeout);
          console.warn(`Firestore error on ${collectionPath}/${docId}:`, err.message);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`Failed to set up listener for ${collectionPath}/${docId}:`, err);
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
