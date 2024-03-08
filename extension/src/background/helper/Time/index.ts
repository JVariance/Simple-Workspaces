const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;
const MILLISECONDS_IN_MINUTE = MILLISECONDS_IN_SECOND * SECONDS_IN_MINUTE;
const MILLISECONDS_IN_HOUR = MILLISECONDS_IN_MINUTE * MINUTES_IN_HOUR;
const HOURS_IN_DAY = 24;
const MINUTES_IN_DAY = MINUTES_IN_HOUR * HOURS_IN_DAY;

export const convertMillisecondsToMinutes = (ms: number) =>
	ms / MILLISECONDS_IN_MINUTE;

export const convertSecondsToMinutes = (s: number) => s / SECONDS_IN_MINUTE;

export const convertHoursToMinutes = (h: number) => h * MINUTES_IN_HOUR;

export const convertDaysToMinutes = (d: number) => d * MINUTES_IN_DAY;

/* ______________________________________________________________________________ */

const convertMinutesToMilliseconds = (m: number) => m * MILLISECONDS_IN_MINUTE;

export const convertHoursToMilliseconds = (h: number) =>
	h * MILLISECONDS_IN_HOUR;
