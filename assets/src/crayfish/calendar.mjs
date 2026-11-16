// GitHub's contribution calendar omits days outside the collected year.
// Slots stay indexed by weekday so a partial week still lines up with Sunday.

const LEVEL_BY_NAME = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CALENDAR_QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            weekday
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}`;

export async function fetchCalendar(login, token) {
  if (!login) throw new Error("fetchCalendar: login is required");
  if (!token) throw new Error("fetchCalendar: token is required");

  let response;
  try {
    response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        // GitHub rejects clients that omit a User-Agent.
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "crayfish-contributions",
      },
      body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login } }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`GitHub GraphQL request failed: ${message}`);
  }

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub GraphQL HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new Error("GitHub GraphQL response was not JSON");
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const messages = payload.errors.map((error) => error?.message ?? "unknown error").join("; ");
    throw new Error(`GitHub GraphQL error: ${messages}`);
  }
  if (!payload.data?.user) {
    throw new Error(`GitHub GraphQL error: user "${login}" was not found`);
  }
  return payload;
}

export function normalizeCalendar(raw) {
  const weeks = raw?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!Array.isArray(weeks)) {
    throw new Error("normalizeCalendar: contributionCalendar.weeks is missing");
  }

  return {
    weeks: weeks.map((week, weekIndex) => {
      const slots = [null, null, null, null, null, null, null];
      for (const day of week?.contributionDays ?? []) {
        const weekday = day?.weekday;
        if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
          throw new Error(`normalizeCalendar: week ${weekIndex} has invalid weekday ${weekday}`);
        }
        if (!(day.contributionLevel in LEVEL_BY_NAME)) {
          throw new Error(
            `normalizeCalendar: unknown contributionLevel "${day.contributionLevel}"`,
          );
        }
        slots[weekday] = {
          date: day.date,
          level: LEVEL_BY_NAME[day.contributionLevel],
          count: day.contributionCount,
        };
      }
      return slots;
    }),
  };
}
