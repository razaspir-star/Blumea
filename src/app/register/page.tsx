"use client";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
export default function RegisterPage() {
      const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
 



  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: "",
  });

  function validateFullName(value: string) {
  let message = "";

  if (!value.trim()) {
    message = "Please enter your full name.";
  } else if (value.trim().length < 2) {
    message = "Please enter a valid name.";
  }

  setErrors((prev) => ({
    ...prev,
    fullName: message,
  }));
}

function validateEmail(value: string) {
  let message = "";

  if (!value.trim()) {
    message = "Please enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    message = "Please enter a valid email address.";
  }

  setErrors((prev) => ({
    ...prev,
    email: message,
  }));
}

function validatePassword(value: string) {
  let message = "";

  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  if (value.length < 8) {
    message = "Password must be at least 8 characters.";
  } else if (!hasLetter || !hasNumber) {
    message = "Password must include both letters and numbers.";
  }

  setErrors((prev) => ({
    ...prev,
    password: message,
  }));
}

function validateConfirmPassword(value: string) {
  let message = "";

  if (!value) {
    message = "Please confirm your password.";
  } else if (value !== password) {
    message = "Passwords do not match.";
  }

  setErrors((prev) => ({
    ...prev,
    confirmPassword: message,
  }));
}

async function handleResendVerification() {
  if (resendCooldown > 0) {
    return;
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    console.error("Resend error:", error.message);
    return;
  }

  setResendSuccess(true);
  setResendCooldown(60);

  const interval = setInterval(() => {
    setResendCooldown((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        return 0;
      }

      return prev - 1;
    });
  }, 1000);
}

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const newErrors = {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: "",
  };

  if (!fullName.trim()) {
    newErrors.fullName = "Please enter your full name.";
  }

  if (!email.trim()) {
    newErrors.email = "Please enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newErrors.email = "Please enter a valid email address.";
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (password.length < 8) {
    newErrors.password = "Password must be at least 8 characters.";
  } else if (!hasLetter || !hasNumber) {
    newErrors.password = "Password must include both letters and numbers.";
  }

  if (!confirmPassword) {
    newErrors.confirmPassword = "Please confirm your password.";
  } else if (confirmPassword !== password) {
    newErrors.confirmPassword = "Passwords do not match.";
  }

  if (!acceptedTerms) {
    newErrors.terms = "You must accept the Terms and Privacy Policy.";
  }

  setErrors(newErrors);

  const hasErrors = Object.values(newErrors).some(
    (error) => error !== ""
  );

  if (hasErrors) {
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      data: {
        full_name: fullName,
        marketing_emails: marketingEmails,
      },
    },
  });

if (error) {
  if (error.message.includes("rate limit")) {
    setSignupError(
      "Too many verification emails were sent. Please wait a little and try again."
    );
  } else {
    setSignupError(error.message);
  }

  return;
}

setSignupError("");
setSignupSuccess(true);
}

  return (
<main className="relative min-h-screen bg-gradient-to-b from-white to-blumea-mist px-6 py-6 sm:px-8">     
    

{/* Brand */}
<div className="absolute left-6 top-6 flex items-center gap-3 sm:left-8">
  <Image
    src="/blumea-logo-v2.png"
    alt="Blumea logo"
    width={44}
    height={44}
    priority
  />

  <span className="text-2xl font-semibold tracking-tight text-blumea-navy">
    Blum<span className="text-blumea-blue">ea</span>
  </span>
</div>
<section className="flex justify-center pb-8 pt-20 sm:pt-16">
      {/* Register Form */}
     <section className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">

 {signupSuccess ? (
  <div className="text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blumea-mist text-2xl">
      ✉️
    </div>

    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-blumea-navy">
      Check your email
    </h1>

    <p className="mt-3 text-sm leading-6 text-blumea-slate">
      We sent a verification link to
    </p>

    <p className="mt-1 font-semibold text-blumea-navy">
      {email}
    </p>

    <p className="mt-4 text-sm leading-6 text-blumea-slate" >
      Verify your email to continue setting up your Blumea account.
    </p>
    <button
    type="button"
    onClick={handleResendVerification}
        disabled={resendCooldown > 0}
    className="mt-1 font-normal text-blumea-blue transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
  >
  
    <span>
  Didn’t get an Email?
  <br />
 {resendCooldown > 0
  ? `Resend again in ${resendCooldown}s`
  : "Resend verification email"}
</span>
  </button>
  </div>
) : (
  <div>

          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy">
              Create your account
            </h1>

            <p className="mt-3 text-sm leading-6 text-blumea-slate">
              Start understanding what works in your content.
            </p>
          </div>

          <div className="mt-6">
            <button
              type="button"
               className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-blumea-navy transition hover:bg-blumea-mist"
  >
              <span className="text-lg font-bold">G</span>
              Continue with Google
             </button>   
             {resendSuccess && (
  <p className="mt-2 text-sm text-blumea-success">
    ✓ Verification email sent
  </p>
)}  
        </div>

        <div className="my-2 flex items-center gap-4">
  <div className="h-px flex-1 bg-slate-200" />

  <span className="text-xs text-blumea-slate">
    or
  </span>

  <div className="h-px flex-1 bg-slate-200" />
</div>

          <form className="space-y-4 text-left"
          onSubmit={handleSubmit}
          >

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-blumea-navy"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => {
                 const value = e.target.value;
                 setFullName(value);

                 if (errors.fullName) {
                   validateFullName(value);
                  }
                }}
                onBlur={() => validateFullName(fullName)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-blumea-navy outline-none transition placeholder:text-slate-400 focus:border-blumea-blue focus:ring-4 focus:ring-blumea-blue/10"
              />
              {errors.fullName && (
                 <p className="mt-1.5 text-sm text-red-500">
                 {errors.fullName}
                 </p>
                    )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-blumea-navy"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
  const value = e.target.value;
  setEmail(value);

  if (errors.email) {
    validateEmail(value);
  }
}}
onBlur={() => validateEmail(email)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-blumea-navy outline-none transition placeholder:text-slate-400 focus:border-blumea-blue focus:ring-4 focus:ring-blumea-blue/10"
              />
              {errors.email && (
  <p className="mt-1.5 text-sm text-red-500">
    {errors.email}
  </p>
)}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-blumea-navy"
              >
                Password
              </label>

           <div className="relative">
  <input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="Create a password"
    value={password}
    onChange={(e) => {
      const value = e.target.value;
      setPassword(value);

      if (errors.password) {
        validatePassword(value);
      }
    }}
    onBlur={() => validatePassword(password)}
    className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-blumea-navy outline-none transition placeholder:text-slate-400 focus:border-blumea-blue focus:ring-4 focus:ring-blumea-blue/10"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-blumea-slate transition hover:text-blumea-navy"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? (
  <EyeOff size={20} />
) : (
  <Eye size={20} />
)}
  </button>
</div>
              <p className="mt-1.5 text-xs text-blumea-slate">
  Use at least 8 characters with both letters and numbers.
</p>

{errors.password && (
  <p className="mt-1.5 text-sm text-red-500">
    {errors.password}
  </p>
)}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-semibold text-blumea-navy"
              >
                Confirm Password
              </label>

<div className="relative">
  <input
    id="confirm-password"
    type={showConfirmPassword ? "text" : "password"}
    placeholder="Repeat your password"
    value={confirmPassword}
    onChange={(e) => {
      const value = e.target.value;
      setConfirmPassword(value);

      if (errors.confirmPassword) {
        validateConfirmPassword(value);
      }
    }}
    onBlur={() => validateConfirmPassword(confirmPassword)}
    className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-blumea-navy outline-none transition placeholder:text-slate-400 focus:border-blumea-blue focus:ring-4 focus:ring-blumea-blue/10"
  />

  <button
    type="button"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-blumea-slate transition hover:text-blumea-navy"
    aria-label={
      showConfirmPassword ? "Hide password" : "Show password"
    }
  >
    {showConfirmPassword ? (
  <EyeOff size={20} />
) : (
  <Eye size={20} />
)}
  </button>
</div>
              {errors.confirmPassword && (
  <p className="mt-1.5 text-sm text-red-500">
    {errors.confirmPassword}
  </p>
)}
            </div>

 <div>
  <label className="flex items-start gap-3 text-sm text-blumea-slate">
    <input
      type="checkbox"
      checked={acceptedTerms}
      onChange={(e) => setAcceptedTerms(e.target.checked)}
      className="mt-1 h-4 w-4 rounded border-slate-300 accent-blumea-blue"
    />

    <span>
      I agree to the{" "}
      <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blumea-blue">
        Terms
      </a>{" "}
      and{" "}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-blumea-blue">
        Privacy Policy
      </a>
    </span>
  </label>

  {errors.terms && (
    <p className="mt-1.5 text-sm text-red-500">
      {errors.terms}
    </p>
  )}

</div>

  <label className="flex items-start gap-3 text-sm text-blumea-slate">
  <input
    type="checkbox"
    checked={marketingEmails}
    onChange={(e) => setMarketingEmails(e.target.checked)}
    className="mt-1 h-4 w-4 rounded border-slate-300 accent-blumea-blue"
  />

  <span>
    I’d like to receive updates, tips, and news from Blumea.
  </span>
</label>


            <button
              type="submit"
              className="w-full rounded-2xl bg-blumea-blue px-6 py-3.5 font-semibold text-white transition hover:bg-blumea-blue-hover"
            >
              Create Account
            </button>
            {signupError && (
  <p className="text-center text-sm text-red-500">
    {signupError}
  </p>
)}

          </form>

               <p className="mt-4 text-center text-sm text-blumea-slate">
            Already have an account?{" "}
            <AppLink
              href="/login"
              className="font-semibold text-blumea-blue hover:underline"
            >
              Log in
            </AppLink>
          </p>

        </div>
      )}

      </div>
    </section>
  </section>

  </main>
);
}