import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// We use a placeholder and initialize lazily or via a known pattern 
// since Vite might struggle with the JSON file existence at build time
const firebaseConfig = {
  apiKey: "AIzaSyB1qJvAH2diaYS-YwESipGg4qdxQrzJbt0",
  authDomain: "gen-lang-client-0046536504.firebaseapp.com",
  projectId: "gen-lang-client-0046536504",
  storageBucket: "gen-lang-client-0046536504.firebasestorage.app",
  messagingSenderId: "691949018718",
  appId: "1:691949018718:web:1e415af3fe97c8af5ddecf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-53403c69-d3dd-47dd-883f-df6509951537");
