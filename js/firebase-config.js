// Configuración del proyecto de Firebase que gestiona las cuentas de clientes.
// Se obtiene en la consola de Firebase: Configuración del proyecto → Tus apps → App web.
// Estos valores identifican el proyecto y pueden ser públicos; la seguridad la dan
// las reglas de Firestore (archivo firestore.rules) y la autenticación.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
