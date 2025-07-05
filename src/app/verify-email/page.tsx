"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get("token");

        if (!token) {
          setStatus("error");
          setMessage(
            "Invalid verification link. Please request a new verification email."
          );
          return;
        }

        // Verify the email using Better Auth
        await authClient.verifyEmail({
          query: {
            token: token,
          },
        });

        setStatus("success");
        setMessage("Your email has been verified successfully!");
        toast.success("Email verified successfully!");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error: any) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage(
          error?.message || "Failed to verify email. Please try again."
        );
        toast.error("Email verification failed");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case "error":
        return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case "loading":
        return "Verifying your email...";
      case "success":
        return "Email verified successfully!";
      case "error":
        return "Verification failed";
    }
  };

  const getDescription = () => {
    switch (status) {
      case "loading":
        return "Please wait while we verify your email address.";
      case "success":
        return "You will be redirected to the dashboard shortly.";
      case "error":
        return message;
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <a href="/" className="flex items-center self-center font-medium">
          <img src="/malan-caps.svg" alt="Malan" className="h-12 w-auto" />
        </a>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              {getIcon()}
            </div>
            <CardTitle className="text-xl">{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              {status === "success" && (
                <p className="text-sm text-muted-foreground">
                  Welcome to Malan! You can now start learning languages with
                  your AI conversation partner.
                </p>
              )}

              {status === "error" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    If you're having trouble, you can:
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/signup")}
                    >
                      Sign up again
                    </Button>
                    <Button
                      variant="link"
                      onClick={() => router.push("/login")}
                    >
                      Go to login
                    </Button>
                  </div>
                </div>
              )}

              {status === "loading" && (
                <p className="text-sm text-muted-foreground">
                  This should only take a moment...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
          <div className="flex w-full max-w-sm flex-col gap-2">
            <a href="/" className="flex items-center self-center font-medium">
              <img src="/malan-caps.svg" alt="Malan" className="h-12 w-auto" />
            </a>
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
                <CardTitle className="text-xl">Loading...</CardTitle>
                <CardDescription>Please wait...</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
