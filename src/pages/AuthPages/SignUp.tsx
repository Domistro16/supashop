import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";
import { Toaster } from "@/components/ui/sonner";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up | Supashop"
        description="Create a new Supashop account to start managing your store"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
      <Toaster />
    </>
  );
}
