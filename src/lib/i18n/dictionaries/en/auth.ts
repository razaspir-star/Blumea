export const auth = {
  email: "Email",
  password: "Password",
  emailPlaceholder: "you@example.com",
};

export const legal = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  termsShort: "Terms",
};

export const login = {
  title: "Welcome back",
  invalid: "Invalid email or password.",
  profileError: "We couldn't load your Blumea profile.",
  submit: "Log In",
  submitting: "Logging in...",
  newHere: "New to Blumea?",
  createAccount: "Create an account",
};

export const register = {
  title: "Create your account",
  subtitle: "Start understanding what works in your content.",
  or: "or",
  fullName: "Full Name",
  fullNamePlaceholder: "Your name",
  passwordPlaceholder: "Create a password",
  passwordHint: "Use at least 8 characters with both letters and numbers.",
  confirmPassword: "Confirm Password",
  confirmPlaceholder: "Repeat your password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  agreePrefix: "I agree to the",
  agreeAnd: "and",
  marketing: "I'd like to receive updates, tips, and news from Blumea.",
  submit: "Create Account",
  haveAccount: "Already have an account?",
  logIn: "Log in",
  errName: "Please enter your full name.",
  errNameInvalid: "Please enter a valid name.",
  errEmail: "Please enter your email.",
  errEmailInvalid: "Please enter a valid email address.",
  errPasswordShort: "Password must be at least 8 characters.",
  errPasswordWeak: "Password must include both letters and numbers.",
  errConfirm: "Please confirm your password.",
  errMismatch: "Passwords do not match.",
  errTerms: "You must accept the Terms and Privacy Policy.",
  errRateLimit: "Too many verification emails were sent. Please wait a little and try again.",
  checkEmail: "Check your email",
  sentTo: "We sent a verification link to",
  verifyToContinue: "Verify your email to continue setting up your Blumea account.",
  noEmail: "Didn't get an Email?",
  resendIn: "Resend again in {seconds}s",
  resend: "Resend verification email",
  resent: "✓ Verification email sent",
};

const authTexts = { auth, legal, login, register };
export default authTexts;
