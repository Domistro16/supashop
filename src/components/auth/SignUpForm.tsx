import { useState } from "react";
import { Link, useNavigate } from "@/lib/react-router-compat";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import { Input } from "@/components/ui/input";
import Checkbox from "../form/input/Checkbox";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/auth";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !first || !last || !shopName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isChecked) {
      toast.error("Please accept the Terms and Conditions");
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.signUp({
        email,
        password,
        firstName: first,
        lastName: last,
        shopName,
        shopAddress: address,
      });

      toast.success("Account created successfully!");

      // Refresh auth context
      await refreshAuth();

      // Redirect to dashboard
      navigate("/");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 ">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto mt-6 mb-6">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign up!
            </p>
          </div>
          <div>
            <form onSubmit={signUpWithEmail}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- First Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      First Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      placeholder="Enter your first name"
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                      required
                    />
                  </div>
                  {/* <!-- Last Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Last Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      placeholder="Enter your last name"
                      value={last}
                      onChange={(e) => setLast(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {/* <!-- Shop Name --> */}
                <div>
                  <Label>
                    Shop's Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="ShopName"
                    name="ShopName"
                    placeholder="Enter your Shop's Name"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {/* <!-- Address --> */}
                <div>
                  <Label>
                    Shop's Address
                  </Label>
                  <Input
                    type="text"
                    id="address"
                    name="address"
                    placeholder="Enter your Shop's address (optional)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div>
                  <button
                    type="submit"
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:no-cursor disabled:bg-brand-700"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account? {""}
                <Link
                  href="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
