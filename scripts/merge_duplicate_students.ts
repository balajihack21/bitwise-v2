globalThis.localStorage ??= (() => {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
})();

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
