"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { getUserProfile, getUserPreferences } from "@/app/actions/profile";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Profile {
  name?: string;
  email?: string;
  image?: string | null;
}

interface Preferences {
  dailyGoal?: number;
  emailNotifications?: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileResult = await getUserProfile();
        if (profileResult.success && profileResult.profile) {
          setProfile(profileResult.profile);
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefsResult = await getUserPreferences();
        if (prefsResult.success && prefsResult.preferences) {
          const raw = prefsResult.preferences;
          const normalizedPrefs: Preferences = {
            dailyGoal: raw.dailyGoal ?? undefined,
            emailNotifications: raw.emailNotifications ?? undefined,
          };
          setPreferences(normalizedPrefs);
        }
      } catch {
        toast.error("Failed to load preferences");
      } finally {
        setPrefsLoading(false);
      }
    };
    loadPrefs();
  }, []);

  if (loading || prefsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and account security.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileTab
                profile={profile}
                onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Preferences</CardTitle>
              <CardDescription>
                Set your language, daily goal, and notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesTab
                preferences={preferences}
                onPreferencesUpdate={(updatedPrefs) =>
                  setPreferences(updatedPrefs)
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SecurityTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
