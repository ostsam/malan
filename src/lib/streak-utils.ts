import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Updates the user's streak when they perform an activity
 * @param userId - The user's ID
 * @returns Promise<{currentStreak: number, longestStreak: number}>
 */
export async function updateUserStreak(userId: string) {
  try {
    // Get current user preferences
    const currentPrefs = await db
      .select({
        currentStreak: userPreferences.currentStreak,
        longestStreak: userPreferences.longestStreak,
        lastActivityDate: userPreferences.lastActivityDate,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    let newCurrentStreak = 1;
    let newLongestStreak = 0;

    if (currentPrefs.length > 0) {
      const prefs = currentPrefs[0];
      const lastActivity = prefs.lastActivityDate;

      if (lastActivity) {
        const lastActivityDate = new Date(lastActivity);
        lastActivityDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor(
          (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 0) {
          // Same day, don't update streak
          return {
            currentStreak: prefs.currentStreak || 0,
            longestStreak: prefs.longestStreak || 0,
          };
        } else if (daysDiff === 1) {
          // Consecutive day
          newCurrentStreak = (prefs.currentStreak || 0) + 1;
        } else {
          // Streak broken, start over
          newCurrentStreak = 1;
        }
      }

      newLongestStreak = Math.max(prefs.longestStreak || 0, newCurrentStreak);
    } else {
      // First time user
      newLongestStreak = 1;
    }

    // Update user preferences
    await db
      .insert(userPreferences)
      .values({
        userId,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: today.toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: today.toISOString().slice(0, 10),
          updatedAt: new Date(),
        },
      });

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
    };
  } catch (error) {
    console.error("Error updating user streak:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
    };
  }
}

/**
 * Gets the user's current streak information
 * @param userId - The user's ID
 * @returns Promise<{currentStreak: number, longestStreak: number, lastActivityDate: Date | null}>
 */
export async function getUserStreak(userId: string) {
  try {
    const prefs = await db
      .select({
        currentStreak: userPreferences.currentStreak,
        longestStreak: userPreferences.longestStreak,
        lastActivityDate: userPreferences.lastActivityDate,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (prefs.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    return {
      currentStreak: prefs[0].currentStreak || 0,
      longestStreak: prefs[0].longestStreak || 0,
      lastActivityDate: prefs[0].lastActivityDate,
    };
  } catch (error) {
    console.error("Error getting user streak:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    };
  }
}
 