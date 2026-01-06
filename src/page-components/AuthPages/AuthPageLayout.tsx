import React from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "@/lib/react-router-compat";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { ShoppingCartIcon } from "lucide-react";


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center max-w-xs">
              <Link href="/" className="block mb-4">
                <div className="text-5xl font-bold flex items-center gap-3">
                  {" "}
                  <img src="/logo.png" alt="Supashop" className="w-10 h-10 rounded-lg" />
                  Supashop
                </div>
              </Link>

              <p className="text-center text-gray-400 dark:text-white/60">
                The Dashboard your Shop Deserves
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
