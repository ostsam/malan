"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/server/users";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";

import { z } from "zod";
import { useRouter } from "next/navigation";
import { googleSignIn, resendVerificationEmail } from "@/lib/auth-client";

const formSchema = z.object({
  email: z.string().min(6).max(50),
  password: z.string().min(8).max(50),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
  const [verificationError, setVerificationError] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleSignIn = async () => {
    setSocialLoading("google");
    try {
      await googleSignIn();
      // If we reach here, the OAuth redirect was successful
      // No need to show error or success - the redirect will happen
    } catch (error) {
      // Only show error if it's a real error, not a successful redirect
      console.error("Google sign in error:", error);
      toast.error("Google sign in failed");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const result = await resendVerificationEmail(userEmail);
      if (result.success) {
        toast.success("Verification email sent! Please check your inbox.");
      } else {
        toast.error("Failed to send verification email. Please try again.");
      }
    } catch (error) {
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setVerificationError(false);
    const { success, message } = await signIn(values.email, values.password);
    console.log(values);
    if (success) {
      toast.success("User signed in successfully");
      router.push("/dashboard");
    } else {
      // Check if it's an email verification error
      if (message?.includes("verify") || message?.includes("verification")) {
        setVerificationError(true);
        setUserEmail(values.email);
        toast.error("Please verify your email address before signing in");
      } else {
        toast.error("Login unsuccessful");
      }
    }
    setLoading(false);
  }

  if (verificationError) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">
              Email verification required
            </CardTitle>
            <CardDescription>
              Please verify your email address to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We sent a verification link to <strong>{userEmail}</strong>.
                Please check your email and click the verification link.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full"
                >
                  {resending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Resend verification email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setVerificationError(false);
                    form.reset();
                  }}
                >
                  Back to login
                </Button>
                <Button variant="link" onClick={() => router.push("/signup")}>
                  Need to sign up?
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === "google" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Login with Google
                  </Button>
                </div>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email:</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="user@email.com"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <div>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password:</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="**********"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                  <Button
                    type="submit"
                    disabled={loading || socialLoading !== null}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </form>
          </Form>
          <div className="text-center text-sm mt-2">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-primary underline-offset-4 underline"
            >
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
