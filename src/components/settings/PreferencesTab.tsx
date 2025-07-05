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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updatePreferences } from "@/app/actions/profile";
import { toast } from "sonner";
import { Loader2, Languages, Target, Volume2, Bell } from "lucide-react";
import { languageLearningData } from "@/app/dashboard/menu-data/languageLearningData";
import { nativeLanguageData } from "@/app/dashboard/menu-data/nativeLanguageData";

const preferencesSchema = z.object({
  nativeLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
  dailyGoal: z.number().min(1).max(100).optional(),
  ttsVoice: z.string().optional(),
  emailNotifications: z.boolean().optional(),
});

interface PreferencesTabProps {
  preferences: any;
  onPreferencesUpdate: (preferences: any) => void;
}

export function PreferencesTab({
  preferences,
  onPreferencesUpdate,
}: PreferencesTabProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      nativeLanguage: preferences?.nativeLanguage || "",
      targetLanguage: preferences?.targetLanguage || "",
      dailyGoal: preferences?.dailyGoal || 10,
      ttsVoice: preferences?.ttsVoice || "nova",
      emailNotifications: preferences?.emailNotifications ?? true,
    },
  });

  const onSubmit = async (values: z.infer<typeof preferencesSchema>) => {
    setLoading(true);
    try {
      const result = await updatePreferences(values);
      if (result.success) {
        toast.success(result.message);
        onPreferencesUpdate({ ...preferences, ...values });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  const ttsVoices = [
    { value: "nova", label: "Nova (Female)" },
    { value: "echo", label: "Echo (Male)" },
    { value: "fable", label: "Fable (Male)" },
    { value: "onyx", label: "Onyx (Male)" },
    { value: "alloy", label: "Alloy (Male)" },
  ];

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Daily Goal */}
          <FormField
            control={form.control}
            name="dailyGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Daily Learning Goal (words)
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    max="100"
                    placeholder="10"
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? parseInt(value) : undefined);
                    }}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Set how many words you want to save to your wordlist each day.
                  This helps track your learning progress.
                </p>
              </FormItem>
            )}
          />

          {/* Email Notifications */}
          <FormField
            control={form.control}
            name="emailNotifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Email Notifications
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Receive email updates about your learning progress
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
