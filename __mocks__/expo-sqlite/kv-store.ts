// Stockage en mémoire pour Jest (le vrai passe par SQLite natif).
const items = new Map<string, string>();

const Storage = {
  getItemSync: (key: string) => items.get(key) ?? null,
  setItemSync: (key: string, value: string) => void items.set(key, value),
  clearSync: () => items.clear(),
};

export default Storage;
