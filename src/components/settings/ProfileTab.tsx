"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, User, Upload, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

interface Profile {
  name?: string;
  email?: string;
  image?: string | null;
}

interface ProfileTabProps {
  profile: Profile | null;
  onProfileUpdate: (profile: Profile) => void;
}

export function ProfileTab({ profile, onProfileUpdate }: ProfileTabProps) {
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.image);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setLoading(true);
    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: values.name }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        onProfileUpdate({ ...profile, name: values.name });
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, GIF, or WebP");
      return;
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 2MB");
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAvatarUrl(result.avatarUrl);
        onProfileUpdate({ ...profile, image: result.avatarUrl });
        toast.success("Avatar updated successfully!");
      } else {
        toast.error(result.message || "Failed to upload avatar");
      }
    } catch {
      console.error("Avatar upload error");
      toast.error("Failed to upload avatar");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarLoading(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        setAvatarUrl(null);
        onProfileUpdate({ ...profile, image: null });
        toast.success("Avatar removed successfully!");
      } else {
        toast.error(result.message || "Failed to remove avatar");
      }
    } catch {
      console.error("Avatar remove error");
      toast.error("Failed to remove avatar");
    } finally {
      setAvatarLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl ?? undefined} alt={profile?.name} />
            <AvatarFallback className="text-lg">
              {getInitials(profile?.name || "User")}
            </AvatarFallback>
          </Avatar>
          {avatarLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Upload className="h-4 w-4" />
                Upload new photo
              </div>
            </Label>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAvatarRemove}
                disabled={avatarLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={avatarLoading}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, GIF or WebP. Max size 2MB.
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      className="pl-10"
                      placeholder="Enter your name"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email"
                    disabled
                    tabIndex={-1}
                    aria-disabled="true"
                    className="bg-muted cursor-not-allowed opacity-60 select-none pointer-events-none"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed here. Contact support to update your
                  email address.
                </p>
              </FormItem>
            )}
          />

          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
