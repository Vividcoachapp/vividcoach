import { ImageSourcePropType } from 'react-native';

type CoachImageSet = {
  full: ImageSourcePropType;
  /** Per-coach height ratio for the avatar Image element (height = sz * this).
   *  Defaults to 16/9 (≈1.78), matching the standard 9:16 portrait. Override
   *  when a coach's source PNG has a non-9:16 aspect, otherwise resizeMode
   *  "cover" centers the crop and the head ends up out of frame. */
  avatarHeightMultiplier?: number;
};

export const COACH_IMAGES: Record<string, CoachImageSet> = {
  mara: {
    full: require('../../assets/coaches/portraits/full/mara.png'),
  },
  sofia: {
    full: require('../../assets/coaches/portraits/full/sofia.png'),
  },
  marcus: {
    full: require('../../assets/coaches/portraits/full/marcus.png'),
  },
  chloe: {
    full: require('../../assets/coaches/portraits/full/chloe.png'),
    // Chloe's source PNG is 379×996 (aspect 0.381) instead of the standard
    // 9:16 (0.5625), so the avatar's height needs the matching multiplier.
    avatarHeightMultiplier: 996 / 379,
  },
  ally: {
    full: require('../../assets/coaches/portraits/full/ally.png'),
  },
  david: {
    full: require('../../assets/coaches/portraits/full/david.png'),
  },
  jake: {
    full: require('../../assets/coaches/portraits/full/jake.png'),
  },
  kai: {
    full: require('../../assets/coaches/portraits/full/kai.png'),
  },
  jordan: {
    full: require('../../assets/coaches/portraits/full/jordan.png'),
  },
  carmen: {
    full: require('../../assets/coaches/portraits/full/carmen.png'),
  },
  sam: {
    full: require('../../assets/coaches/portraits/full/sam.png'),
  },
  nadia: {
    full: require('../../assets/coaches/portraits/full/nadia.png'),
  },
  dom: {
    full: require('../../assets/coaches/portraits/full/dom.png'),
  },
  hana: {
    full: require('../../assets/coaches/portraits/full/hana.png'),
  },
  andre: {
    full: require('../../assets/coaches/portraits/full/andre.png'),
  },
  lily: {
    full: require('../../assets/coaches/portraits/full/lily.png'),
  },
  owen: {
    full: require('../../assets/coaches/portraits/full/owen.png'),
  },
  claire: {
    full: require('../../assets/coaches/portraits/full/claire.png'),
  },
  marco: {
    full: require('../../assets/coaches/portraits/full/marco.png'),
  },
  ryan: {
    full: require('../../assets/coaches/portraits/full/ryan.png'),
  },
  nina: {
    full: require('../../assets/coaches/portraits/full/nina.png'),
  },
  ben: {
    full: require('../../assets/coaches/portraits/full/ben.png'),
  },
  alex: {
    full: require('../../assets/coaches/portraits/full/alex.png'),
  },
  dana: {
    full: require('../../assets/coaches/portraits/full/dana.png'),
  },
  chris: {
    full: require('../../assets/coaches/portraits/full/chris.png'),
  },
  drew: {
    full: require('../../assets/coaches/portraits/full/drew.png'),
  },
  reese: {
    full: require('../../assets/coaches/portraits/full/reese.png'),
  },
  tom: {
    full: require('../../assets/coaches/portraits/full/tom.png'),
  },
  zoe: {
    full: require('../../assets/coaches/portraits/full/zoe.png'),
  },
  jade: {
    full: require('../../assets/coaches/portraits/full/jade.png'),
  },
};

export function getCoachImages(imageKey: string | undefined): CoachImageSet | null {
  if (!imageKey) return null;
  return COACH_IMAGES[imageKey] ?? null;
}
