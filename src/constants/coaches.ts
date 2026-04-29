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
  imageKey?: string; // lowercase filename stem for portrait lookups — decoupled from display name
}

// ── FREE COACHES (15) ─────────────────────────────────────────────────────────

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
    imageKey: 'mara',
    bio: "Former endurance coach who spent five years training marathon runners before pivoting to everyday athletes. Believes fitness should feel sustainable, not punishing — and that showing up on the hard days matters more than any personal record.",
  },
  {
    id: 2,
    name: 'Sofia',
    gender: 'F',
    age: 31,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'sofia',
    bio: "Certified personal trainer and former dance instructor who brings warmth and creativity to every session. Believes movement should be something you look forward to, not something you dread.",
  },
  {
    id: 3,
    name: 'Marcus',
    gender: 'M',
    age: 37,
    vibe: 'warm',
    bodyType: 'Strong & powerful',
    tier: 'free',
    imageKey: 'marcus',
    bio: "Former high school track coach who found his calling helping adults rediscover the joy of moving their bodies. Leads with encouragement and knows exactly when to push harder and when to back off.",
  },
  {
    id: 4,
    name: 'Chloe',
    gender: 'F',
    age: 32,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'chloe',
    bio: "Group fitness instructor turned one-on-one coach who thrives on building real relationships with the people she trains. Knows that most fitness struggles aren't about willpower — they're about finding the right approach for the right person.",
  },
  {
    id: 5,
    name: 'Ally',
    gender: 'F',
    age: 36,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'ally',
    bio: "Personal trainer and mother of two who found her passion for coaching after navigating her own postpartum fitness journey. Meets every client exactly where they are — no judgment, no shortcuts, just real progress at a pace that fits your life.",
  },
  {
    id: 6,
    name: 'David',
    gender: 'M',
    age: 47,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'david',
    bio: "Former corporate executive who overhauled his health at 40 and never looked back. Coaches with the perspective of someone who's been where his clients are — too busy, too tired, too overwhelmed — and found a way through.",
  },
  {
    id: 7,
    name: 'Jake',
    gender: 'M',
    age: 27,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'jake',
    bio: "Grew up playing soccer through college and discovered a love for strength training after a knee injury forced him to slow down. Coaches the way he wishes someone had coached him — with patience, humor, and zero judgment.",
  },

  // DIRECT — 5
  {
    id: 8,
    name: 'Kai',
    gender: 'M',
    age: 31,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'kai',
    bio: "Certified personal trainer with a background in Nordic athletic training who believes in structure, consistency, and zero wasted effort. Respects your time, tells you exactly what to do, and trusts you to do it.",
  },
  {
    id: 9,
    name: 'Jordan',
    gender: 'F',
    age: 27,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'jordan',
    bio: "Certified strength coach who cut her teeth training college athletes and now brings that same focused energy to her everyday clients. Doesn't do small talk — she does results.",
  },
  {
    id: 10,
    name: 'Carmen',
    gender: 'F',
    age: 33,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'carmen',
    bio: "Biomechanics specialist and former collegiate athlete who approaches fitness like an engineer — precise, methodical, and outcome-focused. Explains the why behind everything, and her clients leave every session smarter than they arrived.",
  },
  {
    id: 11,
    name: 'Sam',
    gender: 'M',
    age: 26,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'sam',
    bio: "Track and field coach who applies sprint training principles to general fitness with surprising effectiveness. Efficient by nature — he'll get you more done in 30 minutes than most coaches will in an hour.",
  },
  {
    id: 12,
    name: 'Nadia',
    gender: 'F',
    age: 30,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'nadia',
    bio: "Sports performance coach who works with amateur athletes looking to get serious about their training. Precise, focused, and allergic to wasted time — she'll have your week planned before you finish your first message.",
  },

  // INTENSE — 3
  {
    id: 13,
    name: 'Dom',
    gender: 'M',
    age: 34,
    vibe: 'intense',
    bodyType: 'Strong & powerful',
    tier: 'free',
    imageKey: 'dom',
    bio: "Strength coach who trained semi-professional MMA fighters before expanding his practice to driven everyday athletes. Doesn't believe in easy days — he believes in earned ones.",
  },
  {
    id: 14,
    name: 'Hana',
    gender: 'F',
    age: 39,
    vibe: 'intense',
    bodyType: 'Athletic',
    tier: 'free',
    imageKey: 'hana',
    bio: "Retired Army Major and certified strength coach who brings military-grade discipline and structure to civilian training. Demands precision, expects accountability, and trains you like she trained soldiers — because the results speak for themselves.",
  },
  {
    id: 15,
    name: 'Andre',
    gender: 'M',
    age: 28,
    vibe: 'intense',
    bodyType: 'Strong & powerful',
    tier: 'free',
    imageKey: 'andre',
    bio: "Former competitive rugby player who discovered coaching after his athletic career ended and realized he missed the intensity of high-performance sport. Brings raw energy and relentless drive to every session — demanding, real, and impossible to quit on.",
  },

];

// ── PREMIUM COACHES (15) ──────────────────────────────────────────────────────

export const PREMIUM_COACHES: Coach[] = [

  // WARM — 7
  {
    id: 16,
    name: 'Lily',
    gender: 'F',
    age: 26,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'lily',
    bio: "Certified yoga and functional fitness instructor who built her practice around helping people move better, not just harder. Approaches every client with genuine curiosity about what makes them tick, and her sessions feel less like workouts and more like conversations.",
  },
  {
    id: 17,
    name: 'Owen',
    gender: 'M',
    age: 30,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'owen',
    bio: "Physical therapist who shifted to coaching after realizing most of his clients needed lifestyle guidance more than injury treatment. Brings clinical knowledge wrapped in a warm, approachable style.",
  },
  {
    id: 18,
    name: 'Claire',
    gender: 'F',
    age: 28,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'claire',
    bio: "Certified health coach who spent three years working in corporate wellness programs before going independent. Known for helping people build habits that actually stick — not just routines that look good on paper.",
  },
  {
    id: 19,
    name: 'Marco',
    gender: 'M',
    age: 29,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'marco',
    bio: "Certified strength coach who grew up in a family that used sports as a way to bond and stay connected. Brings that same community spirit to individual coaching — makes you feel like you truly have someone in your corner.",
  },
  {
    id: 20,
    name: 'Ryan',
    gender: 'M',
    age: 38,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'ryan',
    bio: "High school PE teacher who has coached hundreds of adults through their first 5Ks, first pull-ups, and first real commitments to their health. His warmth is disarming — he makes hard things feel completely manageable.",
  },
  {
    id: 21,
    name: 'Nina',
    gender: 'F',
    age: 25,
    vibe: 'warm',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'nina',
    bio: "Gymnastics coach who discovered a passion for helping adults build the foundational strength they never learned growing up. Patient, encouraging, and genuinely excited by every small win.",
  },
  {
    id: 22,
    name: 'Ben',
    gender: 'M',
    age: 34,
    vibe: 'warm',
    bodyType: 'Strong & powerful',
    tier: 'premium',
    imageKey: 'ben',
    bio: "Former collegiate swimmer who now coaches recreational athletes of all ages and backgrounds. His philosophy is simple: consistency beats intensity every time, and he'll be there to prove it with you.",
  },

  // DIRECT — 5
  {
    id: 23,
    name: 'Alex',
    gender: 'M',
    age: 29,
    vibe: 'direct',
    bodyType: 'Strong & powerful',
    tier: 'premium',
    imageKey: 'alex',
    bio: "Powerlifting coach with a background in sports science who believes the best program is the one you'll actually follow — so he designs around your life, not the other way around.",
  },
  {
    id: 24,
    name: 'Dana',
    gender: 'F',
    age: 35,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'dana',
    bio: "Certified trainer with a background in occupational therapy who specializes in helping people work around injuries, chronic pain, and physical limitations. Direct because she respects your intelligence — no fluff, just solutions.",
  },
  {
    id: 25,
    name: 'Chris',
    gender: 'M',
    age: 40,
    vibe: 'direct',
    bodyType: 'Strong & powerful',
    tier: 'premium',
    imageKey: 'chris',
    bio: "Former competitive CrossFit athlete who learned the hard way that more isn't always better. Now designs smart, structured programs that deliver real results without burning people out.",
  },
  {
    id: 26,
    name: 'Drew',
    gender: 'F',
    age: 32,
    vibe: 'direct',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'drew',
    bio: "Certified sports nutritionist and strength coach who treats food and training as two halves of the same equation. The only coach on the roster who'll plan your week around what you eat as much as how you move.",
  },
  {
    id: 27,
    name: 'Tom',
    gender: 'M',
    age: 49,
    vibe: 'direct',
    bodyType: 'Strong & powerful',
    tier: 'premium',
    imageKey: 'tom',
    bio: "Veteran personal trainer with 20 years of experience who has coached everyone from professional athletes to complete beginners. His directness comes from confidence — he knows what works, and he'll show you.",
  },

  // INTENSE — 3
  {
    id: 28,
    name: 'Reese',
    gender: 'F',
    age: 26,
    vibe: 'intense',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'reese',
    bio: "Former D1 sprinter who channels competitive energy into every coaching session. Celebrates loud, pushes hard, and genuinely believes every person she coaches is capable of more than they think.",
  },
  {
    id: 29,
    name: 'Zoe',
    gender: 'F',
    age: 29,
    vibe: 'intense',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'zoe',
    bio: "HIIT and functional training coach who runs group bootcamps in her spare time just because she loves the energy. Her sessions leave people exhausted, proud, and already looking forward to the next one.",
  },
  {
    id: 30,
    name: 'Jade',
    gender: 'F',
    age: 52,
    vibe: 'intense',
    bodyType: 'Athletic',
    tier: 'premium',
    imageKey: 'jade',
    bio: "Competitive triathlete and certified coach who has completed 12 Ironman races and counting. Her intensity is backed by decades of real experience — she knows exactly how hard the human body can go, and she'll help you find out too.",
  },

];

// ── Combined ──────────────────────────────────────────────────────────────────

export const ALL_COACHES: Coach[] = [...FREE_COACHES, ...PREMIUM_COACHES];

// ── Constraint chips ──────────────────────────────────────────────────────────

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
