"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, QueryConstraint, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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

    async function fetchData() {
      try {
        const collectionRef = collection(db, collectionPath);
        const q = query(collectionRef, ...constraints);
        const snapshot = await getDocs(q);
        if (cancelled) return;

        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...convertTimestamps(d.data()),
        } as T));
        setData(docs);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
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

    async function fetchData() {
      try {
        const docRef = doc(db, collectionPath, docId);
        const snapshot = await getDoc(docRef);
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
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [collectionPath, docId, fetchCount]);

  return { data, loading, error, refetch };
}
