import * as admin from 'firebase-admin';

function loadServiceAccount(): admin.ServiceAccount | undefined {
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!jsonStr) return undefined;

  const parsed = JSON.parse(jsonStr);

  // dotenv reads the value as a literal string, so \\n sequences in the
  // private_key are kept as the two-char sequence "\n" rather than an actual
  // newline. Firebase Admin needs real newlines in the PEM block.
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
}

const serviceAccount = loadServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  });
}

export const firebaseAuth = admin.auth();
