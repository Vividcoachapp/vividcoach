import { Coach, CoachVibe, FREE_COACHES } from '../constants/coaches';

export type GenderPref = 'woman' | 'man' | 'no_preference';
export type AgePref = 'younger' | 'similar' | 'older' | 'no_preference';
export type BodyPref = 'athletic' | 'strong_powerful' | 'no_preference';

export function getCoachMatches(
  vibe: CoachVibe,
  genderPref: GenderPref,
  agePref: AgePref,
  bodyPref: BodyPref
): Coach[] {
  const pool = FREE_COACHES.filter((c) => c.vibe === vibe);

  const scored = pool.map((coach) => {
    let score = 0;

    // Gender — hard preference worth the most
    if (genderPref === 'woman') score += coach.gender === 'F' ? 10 : -5;
    else if (genderPref === 'man') score += coach.gender === 'M' ? 10 : -5;

    // Age — soft preference
    if (agePref === 'younger' && coach.age < 31) score += 5;
    else if (agePref === 'similar' && coach.age >= 29 && coach.age <= 38) score += 5;
    else if (agePref === 'older' && coach.age > 38) score += 5;

    // Body type
    if (bodyPref === 'athletic' && coach.bodyType === 'Athletic') score += 5;
    else if (bodyPref === 'strong_powerful' && coach.bodyType === 'Strong & powerful') score += 5;

    // Small random tiebreaker so repeat runs feel fresh
    score += Math.random() * 0.9;

    return { coach, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.coach);
}
