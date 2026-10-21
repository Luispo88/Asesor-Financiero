// Configuración del proyecto de Firebase que gestiona las cuentas de clientes.
// Se obtiene en la consola de Firebase: Configuración del proyecto → Tus apps → App web.
// Estos valores identifican el proyecto y pueden ser públicos; la seguridad la dan
// las reglas de Firestore (archivo firestore.rules) y la autenticación.
export const firebaseConfig = {
  apiKey: "AIzaSyC4U9yfo8YGsHvs_wGHbGQ-DoQPkWMIZe8",
  authDomain: "asesor-financiero-f146c.firebaseapp.com",
  projectId: "asesor-financiero-f146c",
  storageBucket: "asesor-financiero-f146c.firebasestorage.app",
  messagingSenderId: "779609333823",
  appId: "1:779609333823:web:d670de65b879f2592c988a",
  measurementId: "G-BFZV4Q1MQE",
};

export const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Correos de las cuentas que pueden entrar al Panel del asesor. Deben coincidir con
// la función esAsesor() de firestore.rules, que es la que realmente protege los datos.
export const CORREOS_ASESOR = ["luis1988salas@hotmail.com"];
