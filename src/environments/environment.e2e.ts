// Used by `npm run e2e:build` (`ng build --configuration production,e2e`).
// Points the app at the local Firestore emulator under a `demo-` project ID,
// so end-to-end tests can never read or write production data.
export const environment = {
  production: true,
  useEmulators: true,
  firebaseConfig: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-khitma.firebaseapp.com',
    projectId: 'demo-khitma',
    storageBucket: 'demo-khitma.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000',
    // Placeholder so the analytics module initializes quietly; tests block all analytics requests.
    measurementId: 'G-E2ETEST000',
  },
};
