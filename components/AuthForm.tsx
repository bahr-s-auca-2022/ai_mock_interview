"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import FormField from "@/components/FormField";
import { auth } from "@/firebase/client";
import { signIn, signUp } from "@/lib/actions/auth.action";

const authFormSchema = (mode: "sign-in" | "sign-up" | "reset") => {
  return z.object({
    name:
      mode === "sign-up"
        ? z.string().min(3, "Name must be at least 3 characters")
        : z.string().optional(),
    email: z.string().email("Please enter a valid email"),
    password:
      mode !== "reset"
        ? z.string().min(6, "Password must be at least 6 characters")
        : z.string().optional(),
  });
};

const AuthForm = ({ type: initialType }: { type: "sign-in" | "sign-up" }) => {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">(
    initialType
  );
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = authFormSchema(mode);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const handleSocialSignIn = async (providerName: "google") => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await signIn({ email: result.user.email!, idToken });
      toast.success("Sign in successfully!");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset link sent! Check your inbox.");
      setMode("sign-in");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (mode === "reset") return handleResetPassword(values.email);

    setIsLoading(true);
    try {
      if (mode === "sign-up") {
        const userCredentials = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password!
        );
        const result = await signUp({
          uid: userCredentials.user.uid,
          name: values.name!,
          email: values.email,
          password: values.password!,
        });
        if (!result?.success) return toast.error(result?.message);
        toast.success("Account created! Please sign in.");
        setMode("sign-in");
      } else {
        const userCredentials = await signInWithEmailAndPassword(
          auth,
          values.email,
          values.password!
        );
        const idToken = await userCredentials.user.getIdToken();
        await signIn({ email: values.email, idToken });
        toast.success("Sign in successfully");
        router.push("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-dark-100 font-mona-sans overflow-hidden">
      {/* --- Left Column: Brand & Marketing --- */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 artistic-dots opacity-20" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent-teal/10 rounded-full blur-[120px]" />

        <div className="relative z-10 flex items-center gap-2">
          <Image
            src="/logo2.png"
            alt="EchoMock"
            width={40}
            height={35}
            className="drop-shadow-2xl"
          />
          <span className="text-2xl font-bold tracking-tight text-white">
            EchoMock
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white leading-[1.1] mb-6">
            Master your next <br />
            <span className="text-accent-mustard">big opportunity.</span>
          </h1>
          <p className="text-light-400 text-lg leading-relaxed">
            AI-powered mock interviews that provide real-time feedback,
            confidence scores, and personalized growth paths.
          </p>
        </div>

        <div className="relative z-10 flex gap-8">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">10k+</span>
            <span className="text-sm text-light-600">Interviews Hosted</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">94%</span>
            <span className="text-sm text-light-600">Success Rate</span>
          </div>
        </div>
      </div>

      {/* --- Right Column: Form Area --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-clay/5 rounded-full blur-[100px]" />

        <div className="w-full max-w-md animate-fadeIn">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === "sign-up"
                ? "Join EchoMock"
                : mode === "reset"
                ? "Reset Password"
                : "Sign in successfully"}
            </h2>
            <p className="text-light-400">
              {mode === "sign-up"
                ? "Start your journey to career excellence."
                : mode === "reset"
                ? "Enter your email to receive a reset link."
                : "Enter your credentials to access your dashboard."}
            </p>
          </div>

          {/* Social Buttons (Hidden on Reset) */}
          {mode !== "reset" && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => handleSocialSignIn("google")}
                className="flex items-center justify-center gap-3 px-4 py-3 border border-light-400/10 rounded-xl hover:bg-white/5 transition-all duration-300 group"
              >
                <span className="text-sm font-semibold text-white group-hover:text-accent-mustard transition-colors">
                  Google
                </span>
              </button>
              <button className="flex items-center justify-center gap-3 px-4 py-3 border border-light-400/10 rounded-xl hover:bg-white/5 transition-all duration-300 group opacity-50 cursor-not-allowed">
                <span className="text-sm font-semibold text-white">Github</span>
              </button>
            </div>
          )}

          {mode !== "reset" && (
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-light-400/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-dark-100 px-4 text-light-600">
                  Or continue with email
                </span>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {mode === "sign-up" && (
                <FormField
                  control={form.control}
                  name="name"
                  label="Full Name"
                  placeholder="John Doe"
                />
              )}

              <FormField
                control={form.control}
                name="email"
                label="Email Address"
                placeholder="name@company.com"
                type="email"
              />

              {mode !== "reset" && (
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="password"
                    label="Password"
                    placeholder="••••••••"
                    type="password"
                  />
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="absolute right-0 top-0 text-xs font-semibold text-accent-mustard hover:text-accent-mustard/80 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full h-12 text-base"
              >
                {isLoading
                  ? "Please wait..."
                  : mode === "sign-up"
                  ? "Create Account"
                  : mode === "reset"
                  ? "Send Reset Link"
                  : "Sign In"}
              </Button>
            </form>
          </Form>

          {/* Footer Toggle */}
          <p className="mt-8 text-center text-sm text-light-600">
            {mode === "sign-up"
              ? "Already have an account?"
              : mode === "reset"
              ? "Remembered your password?"
              : "New to EchoMock?"}{" "}
            <button
              onClick={() =>
                setMode(mode === "sign-up" ? "sign-in" : "sign-up")
              }
              className="font-bold text-accent-teal hover:underline underline-offset-4"
            >
              {mode === "sign-up" ? "Sign In" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
