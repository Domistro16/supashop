import { useState } from "react";
import { Link, useNavigate } from "@/lib/react-router-compat";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import { Input } from "@/components/ui/input";
import Checkbox from "../form/input/Checkbox";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/auth";
import { User, Store, Palette, Zap, Check, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  { id: 1, label: "Account", icon: User },
  { id: 2, label: "Your Shop", icon: Store },
  { id: 3, label: "Customize", icon: Palette },
  { id: 4, label: "Plan", icon: Zap },
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", bg: "bg-blue-500", ring: "ring-blue-500" },
  { value: "purple", label: "Purple", bg: "bg-purple-500", ring: "ring-purple-500" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-500", ring: "ring-orange-500" },
  { value: "pink", label: "Pink", bg: "bg-pink-500", ring: "ring-pink-500" },
  { value: "neutral", label: "Neutral", bg: "bg-gray-600", ring: "ring-gray-500" },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₦0",
    period: "forever",
    description: "Perfect for getting started",
    features: ["1 shop", "Up to 100 products", "Basic analytics", "Storefront page"],
    available: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₦9,999",
    period: "/ month",
    description: "For growing businesses",
    features: ["Multiple shops", "Unlimited products", "Advanced analytics", "AI insights", "Priority support"],
    available: false,
  },
  {
    id: "custom",
    name: "Custom",
    price: "Contact us",
    period: "",
    description: "Enterprise-grade solutions",
    features: ["Everything in Pro", "Custom integrations", "Dedicated support", "SLA guarantee"],
    available: false,
  },
];

export default function SignUpForm() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [account, setAccount] = useState({ first: "", last: "", email: "", password: "" });
  const [shop, setShop] = useState({ name: "", address: "" });
  const [customize, setCustomize] = useState({ heroTitle: "", heroSubtitle: "", primaryColor: "blue" });
  const [selectedPlan] = useState("free");

  const canProceedStep1 = account.first && account.last && account.email && account.password.length >= 6 && isChecked;
  const canProceedStep2 = shop.name.trim().length > 0;

  const handleNext = () => {
    if (step === 1 && !canProceedStep1) {
      if (!account.first || !account.last || !account.email || !account.password) {
        toast.error("Please fill in all required fields");
      } else if (account.password.length < 6) {
        toast.error("Password must be at least 6 characters");
      } else if (!isChecked) {
        toast.error("Please accept the Terms and Conditions");
      }
      return;
    }
    if (step === 2 && !canProceedStep2) {
      toast.error("Please enter your shop name");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.auth.signUp({
        email: account.email,
        password: account.password,
        firstName: account.first,
        lastName: account.last,
        shopName: shop.name,
        shopAddress: shop.address || undefined,
        heroTitle: customize.heroTitle || undefined,
        heroSubtitle: customize.heroSubtitle || undefined,
        primaryColor: customize.primaryColor,
      });

      toast.success("Account created successfully!");
      await refreshAuth();
      navigate("/");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto mt-6 mb-6 px-4">

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all
                      ${isDone ? "bg-brand-500 border-brand-500 text-white" : isActive ? "border-brand-500 text-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-gray-200 text-gray-400 dark:border-gray-700"}`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? "text-brand-500" : isDone ? "text-brand-400" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-14px] sm:mt-[-20px] transition-all ${step > s.id ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Account */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h1 className="mb-1 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Create your account
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Let's start with your personal details.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name<span className="text-error-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="First name"
                    value={account.first}
                    onChange={(e) => setAccount({ ...account, first: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last Name<span className="text-error-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={account.last}
                    onChange={(e) => setAccount({ ...account, last: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Email<span className="text-error-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Password<span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={account.password}
                    onChange={(e) => setAccount({ ...account, password: e.target.value })}
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
              <div className="flex items-start gap-3">
                <Checkbox className="w-5 h-5 mt-0.5" checked={isChecked} onChange={setIsChecked} />
                <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  I agree to the{" "}
                  <span className="text-gray-800 dark:text-white/90 font-medium">Terms and Conditions</span>{" "}
                  and{" "}
                  <span className="text-gray-800 dark:text-white font-medium">Privacy Policy</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Shop */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <h1 className="mb-1 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Set up your shop
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tell us about your business.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Shop Name<span className="text-error-500">*</span></Label>
                <Input
                  type="text"
                  placeholder="e.g. Mama Titi's Store"
                  value={shop.name}
                  onChange={(e) => setShop({ ...shop, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <Label>Shop Address <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Input
                  type="text"
                  placeholder="e.g. 12 Allen Avenue, Lagos"
                  value={shop.address}
                  onChange={(e) => setShop({ ...shop, address: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Customize */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <h1 className="mb-1 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Customize your storefront
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personalize how customers see your shop. You can change this later.
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <Label>Hero Title <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Input
                  type="text"
                  placeholder="e.g. Quality Products at Your Doorstep"
                  value={customize.heroTitle}
                  onChange={(e) => setCustomize({ ...customize, heroTitle: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <Label>Hero Subtitle <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Input
                  type="text"
                  placeholder="e.g. Browse our latest collection"
                  value={customize.heroSubtitle}
                  onChange={(e) => setCustomize({ ...customize, heroSubtitle: e.target.value })}
                />
              </div>
              <div>
                <Label>Brand Color</Label>
                <div className="flex gap-3 mt-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCustomize({ ...customize, primaryColor: c.value })}
                      className={`w-8 h-8 rounded-full ${c.bg} transition-all ring-offset-2 dark:ring-offset-gray-900
                        ${customize.primaryColor === c.value ? `ring-2 ${c.ring} scale-110` : "hover:scale-105 opacity-80 hover:opacity-100"}`}
                      title={c.label}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Selected: <span className="capitalize font-medium text-gray-600 dark:text-gray-300">{customize.primaryColor}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Plan */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <h1 className="mb-1 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Choose your plan
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start for free. Upgrade anytime.
              </p>
            </div>
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border-2 p-4 transition-all
                    ${plan.id === selectedPlan && plan.available
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10"
                      : "border-gray-200 dark:border-gray-700"
                    }
                    ${!plan.available ? "opacity-60" : ""}
                  `}
                >
                  {!plan.available && (
                    <span className="absolute top-3 right-3 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                  {plan.id === selectedPlan && plan.available && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1 mb-0.5">
                        <span className="font-bold text-gray-800 dark:text-white">{plan.name}</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-2">{plan.price}</span>
                        {plan.period && <span className="text-xs text-gray-400">{plan.period}</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{plan.description}</p>
                      <ul className="space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Check className="w-3 h-3 text-brand-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center gap-1.5 flex-1 px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition shadow-theme-xs"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center flex-1 px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-brand-700 disabled:cursor-not-allowed transition shadow-theme-xs"
            >
              {loading ? "Creating your account..." : "Create Account"}
            </button>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
