const users = () => JSON.parse(localStorage.getItem('mockUsers')||'{}');
const save = u => localStorage.setItem('mockUsers', JSON.stringify(u));
const listeners=[];
const sesion = { get currentUser(){ const c=JSON.parse(localStorage.getItem('mockAuth')||'null'); return c && wrap(c); } };
function wrap(c){ return { ...c, emailVerified: !!users()[c.email]?.verified, async reload(){ Object.assign(this, {emailVerified: !!users()[c.email]?.verified}); }, async getIdToken(){ return 't'; } }; }
function setCurrent(u){ localStorage.setItem('mockAuth', JSON.stringify(u)); listeners.forEach(f=>f(u && wrap(u))); }
export function getAuth(){ return sesion; }
export function onAuthStateChanged(a, f){ listeners.push(f); setTimeout(()=>f(sesion.currentUser),0); }
export async function createUserWithEmailAndPassword(a, email, pass){ const u=users(); if(u[email]) throw {code:'auth/email-already-in-use'}; const user={uid:'uid-'+Object.keys(u).length, email}; u[email]={...user, pass}; save(u); setCurrent(user); return {user: wrap(user)}; }
export async function signInWithEmailAndPassword(a,email,pass){ const u=users()[email]; if(!u||u.pass!==pass) throw {code:'auth/invalid-credential'}; const user={uid:u.uid,email,displayName:u.displayName}; setCurrent(user); return {user: wrap(user)}; }
export async function updateProfile(user,{displayName}){ const u=users(); u[user.email].displayName=displayName; save(u); }
export async function sendEmailVerification(){ localStorage.setItem('verif', String(Number(localStorage.getItem('verif')||0)+1)); }
export async function sendPasswordResetEmail(){ }
export async function signOut(){ setCurrent(null); }
