import * as Y from 'yjs';

export type NoteCollaborationSnapshot = { title: string; content: string };

export function applyNoteSnapshot(doc: Y.Doc, snapshot: NoteCollaborationSnapshot, origin = 'local') {
  doc.transact(() => {
    const title = doc.getText('title');
    const content = doc.getText('content');
    if (title.length) title.delete(0, title.length);
    if (content.length) content.delete(0, content.length);
    if (snapshot.title) title.insert(0, snapshot.title);
    if (snapshot.content) content.insert(0, snapshot.content);
  }, origin);
}

export function readNoteSnapshot(doc: Y.Doc): NoteCollaborationSnapshot {
  return { title: doc.getText('title').toString(), content: doc.getText('content').toString() };
}
