export type CoachVibe = 'warm' | 'direct' | 'intense';
export type CoachGender = 'F' | 'M';
export type CoachBodyType = 'Athletic' | 'Strong & powerful';

export interface Coach {
  id: number;
  name: string;
  gender: CoachGender;
  age: number;
  vibe: CoachVibe;
  bodyType: CoachBodyType;
  bio: string;
  tier: 'free' | 'premium';
}

export const FREE_COACHES: Coach[] = [
  // WARM — 7
  {
    id: 1,
    name: 'Mara',
    gender: 'F',
    age: 29,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Former endurance coach turned everyday athlete. Believes fitness should feel sustainable, not punishing — showing up on hard days matters more than PRs.",
  },
  {
    id: 2,
    name: 'Sofia',
    gender: 'F',
    age: 31,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Certified personal trainer and former dance instructor. Believes movement should be something you look forward to, not dread.",
  },
  {
    id: 3,
    name: 'Marcus',
    gender: 'M',
    age: 37,
    vibe: 'warm',
    bodyType: 'Strong & powerful',
    tier: 'free',
    bio: "Former high school track coach. Leads with encouragement, knows exactly when to push harder and when to back off.",
  },
  {
    id: 4,
    name: 'Ben',
    gender: 'M',
    age: 34,
    vibe: 'warm',
    bodyType: 'Strong & powerful',
    tier: 'free',
    bio: "Former collegiate swimmer. Consistency beats intensity every time — and he'll be there to prove it with you.",
  },
  {
    id: 5,
    name: 'Chloe',
    gender: 'F',
    age: 32,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Group fitness instructor turned one-on-one coach. Most fitness struggles aren't about willpower — they're about finding the right approach.",
  },
  {
    id: 6,
    name: 'Hannah',
    gender: 'F',
    age: 36,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Personal trainer and mother of two. Found passion after her own postpartum journey. Meets every client exactly where they are.",
  },
  {
    id: 7,
    name: 'David',
    gender: 'M',
    age: 47,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Former corporate executive who overhauled his health at 40. Coaches with the perspective of someone who's been too busy, too tired, too overwhelmed.",
  },
  // DIRECT — 4
  {
    id: 8,
    name: 'Kai',
    gender: 'M',
    age: 31,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Nordic athletic training background. Structure, consistency, zero wasted effort. Respects your time, tells you exactly what to do, trusts you to do it.",
  },
  {
    id: 9,
    name: 'Jordan',
    gender: 'F',
    age: 27,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Former college athlete coach. Doesn't do small talk — she does results.",
  },
  {
    id: 10,
    name: 'Carmen',
    gender: 'F',
    age: 33,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Biomechanics specialist. Approaches fitness like an engineer — precise, methodical, outcome-focused.",
  },
  {
    id: 11,
    name: 'Sam',
    gender: 'M',
    age: 26,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Track and field coach. Gets more done in 30 minutes than most coaches will in an hour.",
  },
  // INTENSE — 3
  {
    id: 12,
    name: 'Reese',
    gender: 'F',
    age: 26,
    vibe: 'intense',
    bodyType: 'Athletic',
    tier: 'free',
    bio: "Former D1 sprinter. Celebrates loud, pushes hard, believes everyone is capable of more than they think.",
  },
  {
    id: 13,
    name: 'Dom',
    gender: 'M',
    age: 34,
    vibe: 'intense',
    bodyType: 'Strong & powerful',
    tier: 'free',
    bio: "Trained semi-professional MMA fighters. Doesn't believe in easy days — believes in earned ones.",
  },
  {
    id: 14,
    name: 'Andre',
    gender: 'M',
    age: 28,
    vibe: 'intense',
    bodyType: 'Strong & powerful',
    tier: 'free',
    bio: "Former competitive rugby player. Raw energy, relentless drive. Demanding, real, impossible to quit on.",
  },
];

export const CONSTRAINT_CHIPS = [
  'Bad knees',
  'Bad back',
  'No gym access',
  'Home workouts only',
  'Vegetarian',
  'Vegan',
  'Gluten free',
  'Traveling often',
  'Early mornings only',
  'Under 6hrs sleep',
  '30 min max sessions',
] as const;

export type ConstraintChip = (typeof CONSTRAINT_CHIPS)[number];
