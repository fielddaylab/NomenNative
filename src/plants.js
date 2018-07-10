// @flow

import { Species } from './types';
import { species_images, trait_images } from '../plants-new/database';

export function getFeatureImage(k: string, v: string) {
  if (v === 'yes') return require('../plants-new/traits/yes-no/yes.jpg');
  if (v === 'no') return require('../plants-new/traits/yes-no/no.jpg');

  if (k === 'leaf shape') k = 'simple leaf shape';
  if (k === 'thorns on twig') k = 'thorns';

  return (trait_images[k] || {})[v.replace('-', ' ')] || [];
}

export function getSpeciesImages(species: Species) {
  return species_images[species.name];
}

export const glossary = {
  "acute": "coming to a point (at less than a 90 degree angle).",
  "alternate leaves": "one leaf attached at each node.",
  "axil": "the junction between a secondary vein and the midvein of a leaf, or between the petiole and the stem. ",
  "axillary": "located in the axil, or in the junction of the petiole (stalk of a leaf) and the stem. ",
  "awl": "a short, curved and sharp structure, in this case, a leaf.",
  "basal": "near the base.",
  "berry": "a fleshy fruit with several seeds.",
  "blade": "the flat, expanded surface area of a leaf.",
  "bract": "a modified leaf, sometimes brightly colored, that may be attached below the flower(s) or fruit(s), or as part of the cone in conifers.",
  "bud scale": "one or more scale-like protective coverings over a bud.",
  "capsule": "a fruit that opens along several seams to reveal the seeds.",
  "compound": "a leaf with more than one blade (leaflets).",
  "dentate": "toothed, or with jagged edges. ",
  "dichotomous": "branching into two.",
  "distal": "furthest from the base.",
  "drupe": "a fleshy berry-like fruit with only one seed.",
  "elliptic": "oval or in shape of an ellipse.",
  "entire": "smooth; lacking teeth or serrations.",
  "fetid": "having an unpleasant odor.",
  "glabrous": "lacking hairs; smooth.",
  "glands": "small round or flat secretory appendages on plant tissues.",
  "glaucous": "having a whitish, waxy coating.",
  "lanceolate": "lance-shaped; tapering to a long tip.",
  "leaflet": "one of several blades of a compound leaf. ",
  "leaf scar": "the mark left on a twig after a leaf falls off or is removed.",
  "margin": "the outer edge, for example of a leaf.",
  "midvein": "primary vein of a leaf from which secondary or lateral veins arise.",
  "midrib": "primary vein of a leaf from which secondary or lateral veins arise.",
  "node": "the region on the stem of a plant where a leaf attaches.",
  "obovate": "broadest above the middle.",
  "obtuse": "not pointed, or only gradually coming to a point (at greater than a 90 degree angle).",
  "opposite leaves": "two leaves attached at each node.",
  "ovate": "broadest below the middle.",
  "palmate": "having leaflets, lobes, or veins radiating from a common center, link fingers from the palm of a hand.",
  "petiole": "the stalk of a leaf.",
  "pinnate": "having leaflets, lobes, or veins radiating from many points along a central axis, like a feather.",
  "pith": "the junction between a secondary vein and the midvein of a leaf, or between the petiole and the stem. ",
  "prickle": "a sharp, stiff extension of the epidermis, or skin of a plant, that functions to defend the plant.",
  "pubescent": "hairy.",
  "rachis": "toothed, or with jagged edges. ",
  "samara": "oval or in shape of an ellipse. ",
  "serrate": "one of several blades of a compound leaf. ",
  "sessile": "lacking a stalk.",
  "short shoot": "a twig that does not elongate, such that leaves appear clustered on a short peg or spur. ",
  "shrub": "a woody plant with more than one primary stem coming out of the ground. ",
  "simple": "the central region within a twig; often hollow, spongy or chambered. ",
  "sinus": "the junction between a secondary vein and the midvein of a leaf, or between the petiole and the stem. ",
  "spine": "a sharp structure derived from a leaf or stipule that functions to defend the plant.",
  "spur shoot": "short, stubby shoots lacking elongated internodes; thus leaves tend to appear clustered on them. ",
  "stipule": "one of several blades of a compound leaf. ",
  "subopposite": "the primary vein (midvein) of a leaf, usually running longitudinally down the middle from base to tip. ",
  "subtended": "occurring beneath or next to a leaf or bract.",
  "terminal": "saw-toothed. ",
  "thorn": "a sharp structure derived from a branch that functions to defend the plant.",
  "tree": "a woody plant with one primary stem (the trunk) coming out of the ground. ",
  "whorled": "three or more leaves attached at each node.",
};
