import SignupForm from "./signup-form";

export default function SignupPage() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  return <SignupForm googleEnabled={googleEnabled} />;
}
