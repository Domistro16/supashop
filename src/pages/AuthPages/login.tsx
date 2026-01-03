'use client'

import { useState } from "react";
import { supabase } from "@/supabaseClient";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");

    if (isRegister) {
      // Owner registration
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setMessage(signUpError.message);
        setLoading(false);
        return;
      }

      // Create shop and profile for owner
      const userId = signUpData.user?.id;
      if (userId) {
        await supabase.from("shops").insert({
          owner_id: userId,
          name: shopName,
        });

        await supabase.from("profiles").insert({
          id: userId,
          shop_id: (
            await supabase
              .from("shops")
              .select("id")
              .eq("owner_id", userId)
              .single()
          ).data?.id,
          name: email.split("@")[0],
          role: "owner",
        });
      }
      window.location.href = "/dashboard";

      setMessage("Owner account created! You can now log in.");
    } else {
      // Staff or owner login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Login successful!");
        // redirect to dashboard
      }
      window.location.href = "/";
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          alt="Your Company"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">
          {isRegister ? "Register Owner Account" : "Login"}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action="" className="space-y-6">
          {isRegister && (
            <div className="mt-2">
              <label
                htmlFor="text"
                className="block text-sm/6 font-medium text-gray-100 text-left"
              >
                Shop Name
              </label>
              <input
                type="text"
                value={shopName}
                required
                autoComplete="shop-name"
                onChange={(e) => setShopName(e.target.value)}
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm/6 font-medium text-gray-100 text-left"
            >
              Email address
            </label>
            <div className="mt-2">
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm/6 font-medium text-gray-100"
              >
                Password
              </label>
              {!isRegister && (
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </a>
                </div>
              )}
            </div>
            <div className="mt-2">
              <input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
              />
            </div>
          </div>

          <div>
            <button
              onClick={handleAuth}
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-indigo-500 cursor-pointer px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {loading ? "Processing..." : isRegister ? "Register" : "Login"}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-400">
          {isRegister ? "Already have an account? " : "New owner?"}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer ml-2"
          >
            {isRegister ? "Login" : " Register here"}
          </button>
        </p>
        <p className="mt-10 text-center text-sm/6 text-gray-400">{message}</p>
      </div>
    </div>
  );
}
