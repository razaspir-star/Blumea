"use client";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n/client";
import { supabase } from "@/lib/supabase";
export default function RegisterPage() {
  const t = useT();
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
    message = t("register.errName");
  } else if (value.trim().length < 2) {
    message = t("register.errNameInvalid");
  }

  setErrors((prev) => ({
    ...prev,
    fullName: message,
  }));
}

function validateEmail(value: string) {
  let message = "";

  if (!value.trim()) {
    message = t("register.errEmail");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    message = t("register.errEmailInvalid");
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
    message = t("register.errPasswordShort");
  } else if (!hasLetter || !hasNumber) {
    message = t("register.errPasswordWeak");
  }

  setErrors((prev) => ({
    ...prev,
    password: message,
  }));
}

function validateConfirmPassword(value: string) {
  let message = "";

  if (!value) {
    message = t("register.errConfirm");
  } else if (value !== password) {
    message = t("register.errMismatch");
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
    newErrors.fullName = t("register.errName");
  }

  if (!email.trim()) {
    newErrors.email = t("register.errEmail");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newErrors.email = t("register.errEmailInvalid");
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (password.length < 8) {
    newErrors.password = t("register.errPasswordShort");
  } else if (!hasLetter || !hasNumber) {
    newErrors.password = t("register.errPasswordWeak");
  }

  if (!confirmPassword) {
    newErrors.confirmPassword = t("register.errConfirm");
  } else if (confirmPassword !== password) {
    newErrors.confirmPassword = t("register.errMismatch");
  }

  if (!acceptedTerms) {
    newErrors.terms = t("register.errTerms");
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
    setSignupError(t("register.errRateLimit"));
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
<LanguageSwitch className="absolute end-6 top-7 sm:end-8" />
<div className="absolute start-6 top-6 sm:start-8">
<div dir="ltr" className="flex items-center gap-3">
  <Image
    src="/blumea-logo-v2.png"
    alt="Blumea"
    width={44}
    height={44}
    priority
  />

  <span className="text-2xl font-semibold tracking-tight text-blumea-navy">
    Blum<span className="text-blumea-blue">ea</span>
  </span>
</div>
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
      {t("register.checkEmail")}
    </h1>

    <p className="mt-3 text-sm leading-6 text-blumea-slate">
      {t("register.sentTo")}
    </p>

    <p dir="ltr" className="mt-1 font-semibold text-blumea-navy">
      {email}
    </p>

    <p className="mt-4 text-sm leading-6 text-blumea-slate" >
      {t("register.verifyToContinue")}
    </p>
    {resendSuccess && (
    <p className="mt-3 text-sm text-blumea-success">{t("register.resent")}</p>
  )}
  <button
    type="button"
    onClick={handleResendVerification}
        disabled={resendCooldown > 0}
    className="mt-1 font-normal text-blumea-blue transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
  >
  
    <span>
  {t("register.noEmail")}
  <br />
 {resendCooldown > 0
  ? t("register.resendIn", { seconds: resendCooldown })
  : t("register.resend")}
</span>
  </button>
  </div>
) : (
  <div>

          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy">
              {t("register.title")}
            </h1>

            <p className="mt-3 text-sm leading-6 text-blumea-slate">
              {t("register.subtitle")}
            </p>
          </div>


          <form className="mt-6 space-y-4 text-start"
          onSubmit={handleSubmit}
          >

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-blumea-navy"
              >
                {t("register.fullName")}
              </label>

              <input
                id="name"
                type="text"
                placeholder={t("register.fullNamePlaceholder")}
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
                {t("auth.email")}
              </label>

              <input
                id="email"
                type="email"
                dir="ltr"
                placeholder={t("auth.emailPlaceholder")}
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
                {t("auth.password")}
              </label>

           <div className="relative">
  <input
    id="password"
    type={showPassword ? "text" : "password"}
    dir="ltr"
    placeholder={t("register.passwordPlaceholder")}
    value={password}
    onChange={(e) => {
      const value = e.target.value;
      setPassword(value);

      if (errors.password) {
        validatePassword(value);
      }
    }}
    onBlur={() => validatePassword(password)}
    className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-blumea-navy rtl:placeholder-shown:text-right outline-none transition placeholder:text-slate-400 focus:border-blumea-blue focus:ring-4 focus:ring-blumea-blue/10"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-blumea-slate transition hover:text-blumea-navy"
    aria-label={showPassword ? t("register.hidePassword") : t("register.showPassword")}
  >
    {showPassword ? (
  <EyeOff size={20} />
) : (
  <Eye size={20} />
)}
  </button>
</div>
              <p className="mt-1.5 text-xs text-blumea-slate">
  {t("register.passwordHint")}
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
                {t("register.confirmPassword")}
              </label>

<div className="relative">
  <input
    id="confirm-password"
    type={showConfirmPassword ? "text" : "password"}
    dir="ltr"
    placeholder={t("register.confirmPlaceholder")}
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
      showConfirmPassword ? t("register.hidePassword") : t("register.showPassword")
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
      {t("register.agreePrefix")}{" "}
      <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blumea-blue">
        {t("legal.termsShort")}
      </a>{" "}
      {t("register.agreeAnd")}{" "}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-blumea-blue">
        {t("legal.privacy")}
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
    {t("register.marketing")}
  </span>
</label>


            <button
              type="submit"
              className="w-full rounded-2xl bg-blumea-blue px-6 py-3.5 font-semibold text-white transition hover:bg-blumea-blue-hover"
            >
              {t("register.submit")}
            </button>
            {signupError && (
  <p className="text-center text-sm text-red-500">
    {signupError}
  </p>
)}

          </form>

               <p className="mt-4 text-center text-sm text-blumea-slate">
            {t("register.haveAccount")}{" "}
            <AppLink
              href="/login"
              className="font-semibold text-blumea-blue hover:underline"
            >
              {t("register.logIn")}
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