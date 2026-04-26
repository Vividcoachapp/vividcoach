import { create } from 'zustand';
import { CoachVibe } from '../constants/coaches';
import { GenderPref, AgePref, BodyPref } from '../utils/coachMatcher';

interface OnboardingState {
  name: string;
  goals: string;
  constraints: string[];
  customConstraint: string;
  vibe: CoachVibe | null;
  genderPref: GenderPref;
  agePref: AgePref;
  bodyPref: BodyPref;
  selectedCoachId: number | null;
  coachCustomName: string;
  isComplete: boolean;

  setName: (name: string) => void;
  setGoals: (goals: string) => void;
  toggleConstraint: (constraint: string) => void;
  setCustomConstraint: (text: string) => void;
  setVibe: (vibe: CoachVibe) => void;
  setGenderPref: (pref: GenderPref) => void;
  setAgePref: (pref: AgePref) => void;
  setBodyPref: (pref: BodyPref) => void;
  setSelectedCoach: (id: number, defaultName: string) => void;
  setCoachCustomName: (name: string) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  name: '',
  goals: '',
  constraints: [],
  customConstraint: '',
  vibe: null,
  genderPref: 'no_preference',
  agePref: 'no_preference',
  bodyPref: 'no_preference',
  selectedCoachId: null,
  coachCustomName: '',
  isComplete: false,

  setName: (name) => set({ name }),
  setGoals: (goals) => set({ goals }),
  toggleConstraint: (constraint) =>
    set((state) => ({
      constraints: state.constraints.includes(constraint)
        ? state.constraints.filter((c) => c !== constraint)
        : [...state.constraints, constraint],
    })),
  setCustomConstraint: (text) => set({ customConstraint: text }),
  setVibe: (vibe) => set({ vibe }),
  setGenderPref: (pref) => set({ genderPref: pref }),
  setAgePref: (pref) => set({ agePref: pref }),
  setBodyPref: (pref) => set({ bodyPref: pref }),
  setSelectedCoach: (id, defaultName) =>
    set({ selectedCoachId: id, coachCustomName: defaultName }),
  setCoachCustomName: (name) => set({ coachCustomName: name }),
  completeOnboarding: () => set({ isComplete: true }),
  reset: () =>
    set({
      name: '',
      goals: '',
      constraints: [],
      customConstraint: '',
      vibe: null,
      genderPref: 'no_preference',
      agePref: 'no_preference',
      bodyPref: 'no_preference',
      selectedCoachId: null,
      coachCustomName: '',
      isComplete: false,
    }),
}));
