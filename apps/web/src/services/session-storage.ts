import type { SessionStorage } from '@erp/api-client';
const key = 'erp.session.signed-out';
let blocked = false;
export const sessionStorage: SessionStorage = {
  read: async () => null,
  write: async () => undefined,
  blocked: async () => blocked || (typeof localStorage !== 'undefined' && localStorage.getItem(key) === 'true'),
  block: async (value) => {
    blocked = value;
    if (typeof localStorage !== 'undefined') {
      if (value) localStorage.setItem(key, 'true');
      else localStorage.removeItem(key);
    }
  },
};
