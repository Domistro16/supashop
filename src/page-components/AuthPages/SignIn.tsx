import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | Supashop"
        description="Sign in to your Supashop account to manage your store"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
