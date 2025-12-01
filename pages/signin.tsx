import { useMemo } from "react";
import { useRouter } from "next/router";
import SignupPage from "./signup";

export default function SigninWrapper() {
  const router = useRouter();
  const role = useMemo(() => (typeof router.query.role === "string" ? router.query.role : "artist"), [router.query.role]);
  return <SignupPage key={`signin-${role}`} />;
}



