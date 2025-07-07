import { db } from "@/db";
import { userPreferences, wordlist } from "@/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";

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

/**
 * Calculates streak history for charts
 * @param userId - The user's ID
 * @param days - Number of days to look back
 * @returns Promise<Array<{date: string, streak: number}>>
 */
export async function getStreakHistory(userId: string, days: number) {
  try {
    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Get daily activity data (words saved per day)
    const dailyActivity = await db
      .select({
        date: sql<string>`DATE(${wordlist.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(wordlist)
      .where(
        and(eq(wordlist.userId, userId), gte(wordlist.createdAt, startDate))
      )
      .groupBy(sql`DATE(${wordlist.createdAt})`)
      .orderBy(sql`DATE(${wordlist.createdAt})`);

    // Create a set of active dates for quick lookup
    const activeDates = new Set(dailyActivity.map((item) => item.date));

    // Calculate streak for each day in the range
    const streakHistory: Array<{ date: string; streak: number }> = [];
    let currentStreak = 0;
    let prevActive = false;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);

      // Check if user was active on this date
      const wasActive = activeDates.has(dateStr);

      if (wasActive) {
        if (prevActive || streakHistory.length === 0) {
          currentStreak++;
        } else {
          // Not consecutive, reset streak to 1
          currentStreak = 1;
        }
        prevActive = true;
      } else {
        // Missed a day, reset streak
        currentStreak = 0;
        prevActive = false;
      }

      // Format date for display
      const displayDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      streakHistory.push({
        date: displayDate,
        streak: currentStreak,
      });
    }

    // Ensure the last value matches the current streak
    // (getUserStreak returns the current streak as of today)
    const userStreak = await getUserStreak(userId);
    if (streakHistory.length > 0) {
      streakHistory[streakHistory.length - 1].streak = userStreak.currentStreak;
    }

    return streakHistory;
  } catch (error) {
    console.error("Error calculating streak history:", error);
    return [];
  }
}

/**
 * Recalculates and updates user streak based on actual activity data
 * This is useful for fixing corrupted streak data
 * @param userId - The user's ID
 * @returns Promise<{currentStreak: number, longestStreak: number}>
 */
export async function recalculateUserStreak(userId: string) {
  try {
    // Get all user activity dates
    const activityDates = await db
      .select({
        date: sql<string>`DATE(${wordlist.createdAt})`,
      })
      .from(wordlist)
      .where(eq(wordlist.userId, userId))
      .groupBy(sql`DATE(${wordlist.createdAt})`)
      .orderBy(sql`DATE(${wordlist.createdAt})`);

    if (activityDates.length === 0) {
      // No activity, reset streak
      await db
        .insert(userPreferences)
        .values({
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: null,
            updatedAt: new Date(),
          },
        });

      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate current streak from most recent activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivityDate = new Date(
      activityDates[activityDates.length - 1].date
    );
    lastActivityDate.setHours(0, 0, 0, 0);

    const daysSinceLastActivity = Math.floor(
      (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate streaks by checking consecutive days
    const sortedDates = activityDates.map((item) => item.date).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      currentDate.setHours(0, 0, 0, 0);

      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        prevDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day
          tempStreak++;
        } else {
          // Gap in activity, reset streak
          tempStreak = 1;
        }
      }

      // Update longest streak
      longestStreak = Math.max(longestStreak, tempStreak);

      // Check if this is the most recent activity and within 1 day
      if (i === sortedDates.length - 1 && daysSinceLastActivity <= 1) {
        currentStreak = tempStreak;
      }
    }

    // Update user preferences
    await db
      .insert(userPreferences)
      .values({
        userId,
        currentStreak,
        longestStreak,
        lastActivityDate: activityDates[activityDates.length - 1].date,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          currentStreak,
          longestStreak,
          lastActivityDate: activityDates[activityDates.length - 1].date,
          updatedAt: new Date(),
        },
      });

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error("Error recalculating user streak:", error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}
