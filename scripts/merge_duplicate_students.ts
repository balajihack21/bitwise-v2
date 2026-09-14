const storagePolyfill: Storage = {
  length: 0,
  key(index: number) {
    return Array.from(store.keys())[index] ?? null;
  },
  getItem(key: string) {
    return store.has(key) ? store.get(key)! : null;
  },
  setItem(key: string, value: string) {
    store.set(key, String(value));
    (storagePolyfill as any).length = store.size;
  },
  removeItem(key: string) {
    store.delete(key);
    (storagePolyfill as any).length = store.size;
  },
  clear() {
    store.clear();
    (storagePolyfill as any).length = 0;
  }
};

const store = new Map<string, string>();
(globalThis as any).localStorage ??= storagePolyfill;

const knownStudent = {
  uid: 'seed_312824104020',
  email: '24cse190@act.edu.in',
  username: 'Arun',
  role: 'student',
  createdAt: '2026-09-14T08:32:46.940Z'
};

const existing = localStorage.getItem('bitwise_registered_users');
if (!existing) {
  localStorage.setItem('bitwise_registered_users', JSON.stringify([knownStudent]));
}

const { mergeDuplicateStudentProgressRecords } = await import('../services/firebase.ts');
const result = await mergeDuplicateStudentProgressRecords();
console.log(JSON.stringify(result, null, 2));
