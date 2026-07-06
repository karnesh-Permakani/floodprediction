// Hardcoded credentials (no backend auth needed for demo)
export const USER_CREDENTIALS  = { email: 'user@floodtn.gov.in',  password: 'user@1234',  role: 'user' };
export const ADMIN_CREDENTIALS = { email: 'admin@floodtn.gov.in', password: 'admin@1234', role: 'admin' };

export function loginUser(email, password) {
  if (email === USER_CREDENTIALS.email && password === USER_CREDENTIALS.password)
    return { ...USER_CREDENTIALS };
  return null;
}

export function getSession() {
  try {
    const s = sessionStorage.getItem('flood_user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function setSession(user) {
  sessionStorage.setItem('flood_user', JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem('flood_user');
}
