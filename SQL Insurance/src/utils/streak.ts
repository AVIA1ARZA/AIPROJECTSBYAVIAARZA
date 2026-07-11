
export function calculateStreak(completedDates: Date[]): number {
  if (completedDates.length === 0) return 0;

  // Normalize dates to YYYY-MM-DD to handle multiple entries on the same day
  const uniqueDates = Array.from(new Set(
    completedDates.map(date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  )).sort((a, b) => b - a); // Sort descending (newest first)

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayTime = yesterday.getTime();

  // Check if the streak is still alive (latest activity must be today or yesterday)
  const latestActivity = uniqueDates[0];
  if (latestActivity < yesterdayTime) {
    return 0;
  }

  let streak = 0;
  let currentExpectedDate = new Date(latestActivity);

  for (let i = 0; i < uniqueDates.length; i++) {
    const activityDate = new Date(uniqueDates[i]);
    
    if (activityDate.getTime() === currentExpectedDate.getTime()) {
      streak++;
      // Move expected date back by one day
      currentExpectedDate.setDate(currentExpectedDate.getDate() - 1);
    } else {
      // Streak broken
      break;
    }
  }

  return streak;
}
