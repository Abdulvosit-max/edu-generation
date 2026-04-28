// Firebase olib tashlandi.
// Mavjud fayllar xato bermasligi uchun mock (bo'sh) obyektlar eksport qilinadi.

export const db: any = null;
export const auth: any = {
  currentUser: {
    uid: "guest-user",
    displayName: "Mehmon",
    email: "guest@example.com",
    photoURL: null
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST   = 'list',
  GET    = 'get',
  WRITE  = 'write',
}

export function handleFirestoreError(error: any, op: any, path: any) {
  console.warn("Firebase o'chirilgan. Operatsiya bajarilmadi:", op, path);
}
