import "../styles/globals.css";
import Head from "next/head";
import { AuthProvider } from "../context/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>IsItYou? - Biometric Friend Identification System</title>
        <meta
          name="description"
          content="Deep Biometric Face Recognition, Topological HUD and 512-D Facial Identification System"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
