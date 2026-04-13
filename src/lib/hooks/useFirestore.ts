"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, QueryConstraint, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// Convert Firestore Timestamps to JS Dates recursively
function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;

  if (obj instanceof Timestamp) {
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertTimestamps(obj[key]);
    }
  }
  return result;
}

type LoadStatus = "loading" | "ready" | "timeout" | "error";

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  status: LoadStatus;
}

interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  status: LoadStatus;
}

export function useCollection<T>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  // Serialize constraints to a stable key for the dependency array
  // This helps prevent infinite re-subscription loops
  const constraintKey = useMemo(() => {
    try {
      return constraints.map(c => {
        // String(c) in Firestore usually returns something like "QueryConstraint(type=limit, value=50)"
        // if not, we try to extract a type and value
        const str = String(c);
        if (str !== "[object Object]") return str;
        
        // Fallback for objects - try to get a stable representation
        // We'll use the constructor name or a generic key
        return c.constructor?.name || "Constraint";
      }).join("|");
    } catch (e) {
      return "base-query";
    }
  }, [constraints]);

  const loading = status === "loading" || status === "timeout";

  useEffect(() => {
    if (!collectionPath) {
      setData([]);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setError(null);

    // Safety timeout — show "still loading" state after 5 seconds
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "timeout" : prev));
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
              ...convertTimestamps(d.data()),
            } as T));
            setData(docs);
            setError(null);
            setStatus("ready");
          } catch (err) {
            console.error(`Error processing snapshot for ${collectionPath}:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setStatus("error");
          }
        },
        (err) => {
          clearTimeout(timeout);
          console.error(`Firestore subscription error for ${collectionPath}:`, err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus("error");
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      console.error(`Error initializing subscription for ${collectionPath}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    }

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, constraintKey]);

  return { data, loading, error, status };
}

export function useDocument<T>(
  collectionPath: string,
  docId: string
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  const loading = status === "loading" || status === "timeout";

  useEffect(() => {
    if (!docId) {
      setData(null);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setError(null);

    // Safety timeout
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "timeout" : prev));
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
                ...convertTimestamps(snapshot.data()),
              } as T);
            } else {
              setData(null);
            }
            setError(null);
            setStatus("ready");
          } catch (err) {
            console.error(`Error processing doc snapshot for ${collectionPath}/${docId}:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setStatus("error");
          }
        },
        (err) => {
          clearTimeout(timeout);
          console.error(`Firestore doc subscription error for ${collectionPath}/${docId}:`, err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus("error");
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      console.error(`Error initializing doc subscription for ${collectionPath}/${docId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    }

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [collectionPath, docId]);

  return { data, loading, error, status };
}
