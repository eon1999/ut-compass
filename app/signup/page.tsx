"use client";

import { useState } from "react";

import { Mail, Lock, User } from "lucide-react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function AuthenticationPage() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    setError("");

    try {
      if (isLogin) {
        const res = await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in:", res.user.uid);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (auth.currentUser && name) {
          await updateProfile(auth.currentUser, { displayName: name });
        }
        console.log("Account created:", userCredential.user.uid);
      }
    } catch (err) {
      // firebase errors often have a code and message
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in:", result.user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>

          <p className="text-gray-600">
            {isLogin ? "Log in to your account" : "Join us today"}
          </p>
        </div>


        <div className="mb-4 bg-black text-white rounded-lg">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path fill="#EA4335" d="M23.64 12.205c0-.78-.07-1.53-.2-2.255H12v4.268h6.36c-.275 1.48-1.14 2.73-2.43 3.57v2.975h3.93c2.29-2.11 3.6-5.22 3.6-8.558z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.93-2.975c-1.09.73-2.5 1.16-4 1.16-3.08 0-5.69-2.08-6.62-4.88H1.29v3.06C3.26 21.9 7.31 24 12 24z" />
              <path fill="#4A90E2" d="M5.38 14.39a7.43 7.43 0 010-4.78V6.55H1.29a12 12 0 000 10.9l4.09-3.06z" />
              <path fill="#FBBC05" d="M12 4.8c1.75 0 3.33.6 4.57 1.77l3.43-3.43C17.94 1.24 15.24 0 12 0 7.31 0 3.26 2.1 1.29 5.55l4.09 3.06C6.31 6.88 8.92 4.8 12 4.8z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>

              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-700"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>
          )}


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-700"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-700"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>


          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-semibold py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>


        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}

            <button
              onClick={() => {
                setIsLogin(!isLogin);

                setError("");
              }}
              className="text-orange-700 font-semibold hover:underline ml-1"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
