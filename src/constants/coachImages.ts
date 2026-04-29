import { ImageSourcePropType } from 'react-native';

type CoachImageSet = {
  full: ImageSourcePropType;
  portrait: ImageSourcePropType;
};

export const COACH_IMAGES: Record<string, CoachImageSet> = {
  mara: {
    full: require('../../assets/coaches/portraits/full/mara.png'),
    portrait: require('../../assets/coaches/portraits/portrait/mara.png'),
  },
  sofia: {
    full: require('../../assets/coaches/portraits/full/sofia.png'),
    portrait: require('../../assets/coaches/portraits/portrait/sofia.png'),
  },
  marcus: {
    full: require('../../assets/coaches/portraits/full/marcus.png'),
    portrait: require('../../assets/coaches/portraits/portrait/marcus.png'),
  },
  chloe: {
    full: require('../../assets/coaches/portraits/full/chloe.png'),
    portrait: require('../../assets/coaches/portraits/portrait/chloe.png'),
  },
  ally: {
    full: require('../../assets/coaches/portraits/full/ally.png'),
    portrait: require('../../assets/coaches/portraits/portrait/ally.png'),
  },
  david: {
    full: require('../../assets/coaches/portraits/full/david.png'),
    portrait: require('../../assets/coaches/portraits/portrait/david.png'),
  },
  jake: {
    full: require('../../assets/coaches/portraits/full/jake.png'),
    portrait: require('../../assets/coaches/portraits/portrait/jake.png'),
  },
  kai: {
    full: require('../../assets/coaches/portraits/full/kai.png'),
    portrait: require('../../assets/coaches/portraits/portrait/kai.png'),
  },
  jordan: {
    full: require('../../assets/coaches/portraits/full/jordan.png'),
    portrait: require('../../assets/coaches/portraits/portrait/jordan.png'),
  },
  carmen: {
    full: require('../../assets/coaches/portraits/full/carmen.png'),
    portrait: require('../../assets/coaches/portraits/portrait/carmen.png'),
  },
  sam: {
    full: require('../../assets/coaches/portraits/full/sam.png'),
    portrait: require('../../assets/coaches/portraits/portrait/sam.png'),
  },
  nadia: {
    full: require('../../assets/coaches/portraits/full/nadia.png'),
    portrait: require('../../assets/coaches/portraits/portrait/nadia.png'),
  },
  dom: {
    full: require('../../assets/coaches/portraits/full/dom.png'),
    portrait: require('../../assets/coaches/portraits/portrait/dom.png'),
  },
  hana: {
    full: require('../../assets/coaches/portraits/full/hana.png'),
    portrait: require('../../assets/coaches/portraits/portrait/hana.png'),
  },
  andre: {
    full: require('../../assets/coaches/portraits/full/andre.png'),
    portrait: require('../../assets/coaches/portraits/portrait/andre.png'),
  },
  lily: {
    full: require('../../assets/coaches/portraits/full/lily.png'),
    portrait: require('../../assets/coaches/portraits/portrait/lily.png'),
  },
  owen: {
    full: require('../../assets/coaches/portraits/full/owen.png'),
    portrait: require('../../assets/coaches/portraits/portrait/owen.png'),
  },
  claire: {
    full: require('../../assets/coaches/portraits/full/claire.png'),
    portrait: require('../../assets/coaches/portraits/portrait/claire.png'),
  },
  marco: {
    full: require('../../assets/coaches/portraits/full/marco.png'),
    portrait: require('../../assets/coaches/portraits/portrait/marco.png'),
  },
  ryan: {
    full: require('../../assets/coaches/portraits/full/ryan.png'),
    portrait: require('../../assets/coaches/portraits/portrait/ryan.png'),
  },
  nina: {
    full: require('../../assets/coaches/portraits/full/nina.png'),
    portrait: require('../../assets/coaches/portraits/portrait/nina.png'),
  },
  ben: {
    full: require('../../assets/coaches/portraits/full/ben.png'),
    portrait: require('../../assets/coaches/portraits/portrait/ben.png'),
  },
  alex: {
    full: require('../../assets/coaches/portraits/full/alex.png'),
    portrait: require('../../assets/coaches/portraits/portrait/alex.png'),
  },
  dana: {
    full: require('../../assets/coaches/portraits/full/dana.png'),
    portrait: require('../../assets/coaches/portraits/portrait/dana.png'),
  },
  chris: {
    full: require('../../assets/coaches/portraits/full/chris.png'),
    portrait: require('../../assets/coaches/portraits/portrait/chris.png'),
  },
  drew: {
    full: require('../../assets/coaches/portraits/full/drew.png'),
    portrait: require('../../assets/coaches/portraits/portrait/drew.png'),
  },
  reese: {
    full: require('../../assets/coaches/portraits/full/reese.png'),
    portrait: require('../../assets/coaches/portraits/portrait/reese.png'),
  },
  tom: {
    full: require('../../assets/coaches/portraits/full/tom.png'),
    portrait: require('../../assets/coaches/portraits/portrait/tom.png'),
  },
  zoe: {
    full: require('../../assets/coaches/portraits/full/zoe.png'),
    portrait: require('../../assets/coaches/portraits/portrait/zoe.png'),
  },
  jade: {
    full: require('../../assets/coaches/portraits/full/jade.png'),
    portrait: require('../../assets/coaches/portraits/portrait/jade.png'),
  },
};

export function getCoachImages(imageKey: string | undefined): CoachImageSet | null {
  if (!imageKey) return null;
  return COACH_IMAGES[imageKey] ?? null;
}
