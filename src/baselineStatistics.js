const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 3_650;

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Return every requested daily date, inclusive, after validating the period. */
export function getExpectedDailyDates(startDate, endDate) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate) {
    throw new Error('Enter valid start and end dates, with start date on or before end date.');
  }
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const difference = (end - start) / DAY_MS;
  if (difference > MAX_RANGE_DAYS) throw new Error('Choose a date range of 10 years or less.');
  return Array.from({ length: difference + 1 }, (_, index) => new Date(start + index * DAY_MS).toISOString().slice(0, 10));
}

/**
 * Calculate descriptive statistics from raw daily categorical index values.
 * Zero is a valid observation. Nulls and omitted dates count as missing; no values
 * are interpolated, converted, or altered. The caller retains its original array.
 */
export function calculateBaselineStatistics({ startDate, endDate, observations }) {
  const expectedDates = getExpectedDailyDates(startDate, endDate);
  if (!Array.isArray(observations)) throw new Error('The provider response did not contain an observations list.');

  const expectedSet = new Set(expectedDates);
  const byDate = new Map();
  for (const item of observations) {
    if (!item || typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date))) {
      throw new Error('The provider returned an observation with an invalid date.');
    }
    const date = item.date.slice(0, 10);
    if (!isCalendarDate(date) || !expectedSet.has(date)) {
      throw new Error('The provider returned an observation outside the selected date range.');
    }
    if (byDate.has(date)) throw new Error(`The provider returned more than one daily observation for ${date}.`);
    if (item.value !== null && (typeof item.value !== 'number' || !Number.isFinite(item.value))) {
      throw new Error(`The provider returned an invalid value for ${date}.`);
    }
    byDate.set(date, item.value);
  }

  const values = expectedDates.flatMap((date) => {
    const value = byDate.get(date);
    return value === null || value === undefined ? [] : [value];
  });
  if (!values.length) throw new Error('No valid observations were returned. A baseline was not created.');

  const sortedValues = [...values].sort((left, right) => left - right);
  // These are binned categories, so an even sample uses the lower middle
  // observed category rather than inventing an intermediate category.
  const median = sortedValues[Math.floor((sortedValues.length - 1) / 2)];
  const frequencies = new Map();
  for (const value of values) frequencies.set(value, (frequencies.get(value) || 0) + 1);
  const categoryDistribution = [...frequencies.entries()]
    .sort(([left], [right]) => left - right)
    .map(([category, count]) => ({ category, count, percentage: count / values.length * 100 }));
  const missingObservations = expectedDates.length - values.length;

  return {
    totalObservations: expectedDates.length,
    receivedObservations: observations.length,
    validObservations: values.length,
    missingObservations,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    median,
    categoryDistribution,
    completenessPercentage: values.length / expectedDates.length * 100,
    isComplete: missingObservations === 0,
    periodDays: expectedDates.length,
    provisional: expectedDates.length < 365,
  };
}
