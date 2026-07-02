import type { WorkoutDayCode } from "@/lib/workouts/currentPlanSeed";

export const WORKOUT_TIME_ZONE = "Europe/Madrid";
export const WORKOUT_DAY_CODES: WorkoutDayCode[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

export function todayMadridDateValue() {
  return formatDateParts(new Date(), WORKOUT_TIME_ZONE);
}

export function getWorkoutWeekStart(dateValue: string) {
  const date = parseDateValueAsUtc(dateValue);
  const day = date.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return formatUtcDateValue(date);
}

export function getWorkoutWeekDates(weekStartDate: string) {
  const start = parseDateValueAsUtc(weekStartDate);
  return WORKOUT_DAY_CODES.map((dayCode, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      dayCode,
      date: formatUtcDateValue(date),
    };
  });
}

export function getWorkoutDayCode(dateValue: string): WorkoutDayCode {
  const date = parseDateValueAsUtc(dateValue);
  const day = date.getUTCDay();
  return WORKOUT_DAY_CODES[day === 0 ? 6 : day - 1];
}

export function formatShortWorkoutDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function shiftWorkoutDate(dateValue: string, days: number) {
  const date = parseDateValueAsUtc(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDateValue(date);
}

function formatDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function parseDateValueAsUtc(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDateValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
