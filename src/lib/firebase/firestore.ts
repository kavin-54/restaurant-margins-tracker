import { db } from "./config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
  FirestoreDataConverter,
} from "firebase/firestore";

// Firestore timestamp converter
const timestampConverter: FirestoreDataConverter<any> = {
  toFirestore: (data: any) => {
    const convertDates = (obj: any): any => {
      if (obj instanceof Date) {
        return Timestamp.fromDate(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(convertDates);
      }
      if (obj !== null && typeof obj === "object" && !(obj instanceof Timestamp)) {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertDates(value);
        }
        return converted;
      }
      return obj;
    };
    return convertDates(data);
  },
  fromFirestore: (snapshot: DocumentSnapshot, options: any) => {
    const data = snapshot.data(options);
    if (!data) return null;

    const converted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Timestamp) {
        converted[key] = value.toDate();
      } else {
        converted[key] = value;
      }
    }
    return converted;
  },
};

export async function getDocument<T>(
  collectionPath: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionPath, docId).withConverter(
    timestampConverter
  );
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
}

export async function getDocuments<T>(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const collectionRef = collection(db, collectionPath).withConverter(
    timestampConverter
  );
  const q = query(collectionRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function addDocument<T extends { id?: string }>(
  collectionPath: string,
  data: Omit<T, "id">
): Promise<T> {
  const collectionRef = collection(db, collectionPath).withConverter(
    timestampConverter
  );
  const docRef = await addDoc(collectionRef, data);
  return {
    ...data,
    id: docRef.id,
  } as T;
}

export async function updateDocument<T>(
  collectionPath: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const docRef = doc(db, collectionPath, docId);
  return updateDoc(docRef, data as any);
}

export async function deleteDocument(
  collectionPath: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, collectionPath, docId);
  return deleteDoc(docRef);
}
