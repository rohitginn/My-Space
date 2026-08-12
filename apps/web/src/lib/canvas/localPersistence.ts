import type { CanvasDocument } from './types';

const DB_NAME = 'myspace-canvas';
const STORE_NAME = 'documents';
const OUTBOX_STORE_NAME = 'outbox';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(OUTBOX_STORE_NAME)) db.createObjectStore(OUTBOX_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function available() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

export async function saveLocalDocument(key: string, document: CanvasDocument): Promise<void> {
  if (!available()) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(document, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function loadLocalDocument(key: string): Promise<CanvasDocument | null> {
  if (!available()) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const get = transaction.objectStore(STORE_NAME).get(key);
      get.onsuccess = () => { db.close(); resolve((get.result as CanvasDocument | undefined) ?? null); };
      get.onerror = () => { db.close(); reject(get.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

export async function enqueueLocalDocumentUpdate(key: string, document: CanvasDocument): Promise<void> {
  if (!available()) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
      transaction.objectStore(OUTBOX_STORE_NAME).put({ document, queuedAt: Date.now() }, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function takeLocalDocumentUpdate(key: string): Promise<CanvasDocument | null> {
  if (!available()) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(OUTBOX_STORE_NAME);
      const get = store.get(key);
      get.onsuccess = () => {
        const result = get.result as { document?: CanvasDocument } | undefined;
        if (result?.document) store.delete(key);
        db.close();
        resolve(result?.document ?? null);
      };
      get.onerror = () => { db.close(); reject(get.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

export async function clearLocalDocumentUpdate(key: string): Promise<void> {
  if (!available()) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
      transaction.objectStore(OUTBOX_STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function clearLocalDocument(key: string): Promise<void> {
  if (!available()) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME, OUTBOX_STORE_NAME], 'readwrite');
        transaction.objectStore(STORE_NAME).delete(key);
        transaction.objectStore(OUTBOX_STORE_NAME).delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
