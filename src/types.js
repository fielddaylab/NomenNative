// @flow

import { Map, Set } from 'immutable';

function canoncalize(s: string): string {
  return s.trim().split(/_|\s+/g).join(' ').toLowerCase();
}

export function readObjects(data: Array<{ [string]: string }>): Array<Species> {
  let dataset = [];
  for (const row of data) {
    const attrs = {};
    const tabs = {};
    const facts = {};
    let scientific = '';
    let common = '';
    let family = '';
    let description = '';
    for (let k in row) {
      let v = row[k];
      if (v === null) v = '';
      k = canoncalize(k);
      if (k === 'name' || k === 'scientific name') scientific = v;
      else if (k === 'common name') common = v;
      else if (k === 'genus') ;
      else if (k === 'species') ;
      else if (k === 'family') {
        v = v.slice(v.indexOf('(') + 1);
        v = v.slice(0, v.indexOf(')'));
        family = v;
      } else if (k === 'description' || k === 'd-description') {
        description = v;
      } else if (k.match(/^description /)) {
        tabs[k.slice('description '.length)] = v;
      } else if (k.match(/^d-/)) {
        tabs[k.slice('d-'.length)] = v;
      } else if (k.match(/^info /)) {
        facts[k.slice('info '.length)] = v;
      } else {
        if (k.match(/(\d|\*)$/)) k = k.slice(0, k.length - 1);
        const vals = v.split(',').map(canoncalize).filter((s) => s != '').map((v) => {
          // hacks
          if (v === 'orbiculate') return 'orbicular';
          if (v === 'orbiculate (round)') return 'orbicular';
          v = v.replace(/^< /, '<');
          v = v.replace(/^> /, '>');
          return v;
        });
        if (attrs[k] != null) {
          attrs[k] = attrs[k].union(Set(vals));
        } else {
          attrs[k] = Set(vals);
        }
      }
    }
    if (attrs.planttype == null) attrs.planttype = Set(['prairie plant']);
    // remove planttype for now
    delete attrs.planttype;
    delete attrs['tree type'];
    if (!(scientific.match(/\S/))) continue;
    dataset.push(new Species(scientific, common, family, description, Map(attrs), Map(tabs), Map(facts)));
  }
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (const specimen of dataset) {
    for (let height of Array.from(specimen.attributes.get('plant height') || [])) {
      height = parseInt(height);
      if (height < minHeight) minHeight = height;
      if (height > maxHeight) maxHeight = height;
    }
  }
  if (minHeight !== Infinity) {
    const categoryRange = (maxHeight - minHeight) / 8; // tweak this
    const categories = [];
    for (let i = 0; i < 8; i++) {
      let lowerBound = Math.floor(minHeight + categoryRange * i);
      let upperBound = Math.floor(minHeight + categoryRange * (i + 1) - 1);
      if (i === 7) upperBound++;
      categories.push([lowerBound, upperBound]);
    }
    for (const specimen of dataset) {
      const matching = [];
      let specMin = Infinity;
      let specMax = -Infinity;
      for (let height of Array.from(specimen.attributes.get('plant height') || [])) {
        height = parseInt(height);
        if (height < specMin) specMin = height;
        if (height > specMax) specMax = height;
      }
      for (let cat of categories) {
        let isOverlap = true;
        if (specMax < cat[0]) isOverlap = false;
        if (specMin > cat[1]) isOverlap = false;
        if (isOverlap) {
          matching.push(cat[0] + ' to ' + cat[1]);
        }
      }
      specimen.attributes = specimen.attributes.set('plant height', Set(matching));
    }
  }
  return dataset;
}

export class Species {
  name: string;
  displayName: string;
  family: string;
  description: string;
  attributes: Map<string, Set<string>>;
  tabs: Map<string, string>;
  facts: Map<string, string>;

  constructor(scientific: string, common: string, family: string, description: string, attributes: Map<string, Set<string>> = Map(), tabs: Map<string, string> = Map(), facts: Map<string, string> = Map()) {
    this.name = scientific;
    this.displayName = common;
    this.family = family;
    this.description = description;
    this.attributes = attributes;
    this.tabs = tabs;
    this.facts = facts;
  }

  lookupKey(key: string): Set<string> {
    return this.attributes.get(key) || Set();
  }

  score(attrs: Map<string, Set<string>>): number {
    let n: number = 0;
    let d: number = 0;
    attrs.forEach((vs, k) => {
      if (vs.size == 0) return;
      const my = this.lookupKey(k);
      if (my.has('unavailable') || vs.some((v) => my.has(v))) n++;
      d++;
    });
    return d == 0 ? 1 : n / d;
  }
}

type Dependency
  = {column: string, is: Set<string>}
  | {column: string, is_not: Set<string>}
  ;

export class Dataset {
  attributes: Map<string, Set<string>>;
  species: Array<Species>;
  dependencies: Map<string, Array<Dependency>>;

  constructor(species: Array<Species>) {
    this.species = species;
    let keys: Set<string> = Set();
    species.forEach((sp) => {
      keys = keys.union(Set(sp.attributes.keys()));
    });
    this.attributes = Map();
    keys.forEach((k) => {
      species.forEach((sp) => {
        const vs: ?Set<string> = sp.attributes.get(k);
        if (vs) {
          vs.forEach((v) => {
            if (v === 'unavailable') return;
            this.attributes = this.attributes.update(k, Set(), (set) => set.add(v));
          });
        }
      });
    });
    this.dependencies = Map();
  }

  score(attrs: Map<string, Set<string>>): Array<[Species, number]> {
    const species = this.species.map(function(sp){
      return [sp, sp.score(attrs)];
    });
    return species.sort(function(x, y){
      return y[1] - x[1];
    });
  }
}
