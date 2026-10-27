export function getFirestore(){return {}}
export function doc(db,col,id){return col+'/'+id}
export function collection(db,col){return col}
const ts = (v) => v === 'ts' ? { toDate: () => new Date(Number(localStorage.getItem('now')||Date.now())) } : v;
export async function setDoc(ref,data,opt){ const prev = opt?.merge ? JSON.parse(localStorage.getItem('doc:'+ref)||'{}') : {}; localStorage.setItem('doc:'+ref, JSON.stringify({...prev,...data})); }
export async function getDoc(ref){const v=localStorage.getItem('doc:'+ref); return {exists:()=>!!v, data:()=>JSON.parse(v)}}
export async function getDocs(col){
  const email = JSON.parse(localStorage.getItem('mockAuth')||'null')?.email;
  const u = JSON.parse(localStorage.getItem('mockUsers')||'{}')[email];
  if (!(email==='luis1988salas@hotmail.com' && u?.verified)) throw {code:'permission-denied'};
  const docs=[]; for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith('doc:'+col+'/')){ const d=JSON.parse(localStorage.getItem(k)); for (const f of Object.keys(d)) d[f]=ts(d[f]); docs.push({id:k.split('/')[1], data:()=>d}); } }
  return { forEach: (fn)=>docs.forEach(fn) };
}
export function serverTimestamp(){return 'ts'}
