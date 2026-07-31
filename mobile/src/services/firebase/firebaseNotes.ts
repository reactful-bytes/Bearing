import {
  Firestore,
  Unsubscribe,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getFirebaseApp } from './firebaseApp';
import { CreateNoteInput, NoteRecord, UpdateNoteInput } from '../../features/notes/noteTypes';

let cachedDb: Firestore | null = null;

function getFirebaseFirestore(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    cachedDb = getFirestore(getFirebaseApp());
    return cachedDb;
  } catch (error) {
    throw new Error('Failed to initialize Firestore.', { cause: error });
  }
}

function docToNote(snapshot: QueryDocumentSnapshot<DocumentData>): NoteRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId as string,
    title: data.title as string,
    body: data.body as string,
    source: data.source as NoteRecord['source'],
    sourceEventId: (data.sourceEventId as string | null) ?? null,
    sourceStepId: (data.sourceStepId as string | null) ?? null,
    processed: Boolean(data.processed),
    archived: Boolean(data.archived),
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

function buildNoteTitle(
  input: Pick<CreateNoteInput, 'title' | 'body'> & { source?: CreateNoteInput['source'] },
): string {
  const explicitTitle = input.title?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const bodyLine = input.body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (bodyLine) {
    return bodyLine.length > 48 ? `${bodyLine.slice(0, 45)}...` : bodyLine;
  }

  return input.source === 'idea_dump' ? 'Idea Dump' : 'New Note';
}

export function subscribeToNotes(
  userId: string,
  onNext: (notes: NoteRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const notesQuery = query(
    collection(db, 'notes'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      onNext(snapshot.docs.map(docToNote));
    },
    (firestoreError) => {
      onError(new Error('Failed to load notes.', { cause: firestoreError }));
    },
  );
}

export async function createNote(userId: string, input: CreateNoteInput): Promise<string> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();

  const docRef = await addDoc(collection(db, 'notes'), {
    userId,
    title: buildNoteTitle(input),
    body: input.body.trim(),
    source: input.source,
    sourceEventId: input.sourceEventId ?? null,
    sourceStepId: input.sourceStepId ?? null,
    processed: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function updateNote(
  _userId: string,
  noteId: string,
  fields: UpdateNoteInput,
): Promise<void> {
  const db = getFirebaseFirestore();

  await updateDoc(doc(db, 'notes', noteId), {
    title: buildNoteTitle({ title: fields.title, body: fields.body }),
    body: fields.body.trim(),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteNote(_userId: string, noteId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, 'notes', noteId));
}
