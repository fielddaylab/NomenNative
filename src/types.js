// @flow

import Papa from 'papaparse';
import { Map, Set } from 'immutable';

function canoncalize(s: string): string {
  return s.trim().split(/_|\s+/g).join(' ').toLowerCase();
}

export function readCSV(csv: string): Array<Species> {
  const data: Array<{ [string]: string }> = Papa.parse(csv, {header: true}).data;
  return data.map((row) => {
    const attrs = {};
    const tabs = {};
    for (let k in row) {
      let v = row[k];
      k = canoncalize(k);
      if (k === 'name' || k === 'description') continue;
      if (k.match(/^tab /)) {
        tabs[k.slice('tab '.length)] = v;
      } else {
        attrs[k] = Set(v.split(',').map(canoncalize).filter((s) => s != ''));
      }
    }
    return new Species(row.name, row.description, Map(attrs), Map(tabs));
  });
}

export class Species {
  name: string;
  description: string;
  attributes: Map<string, Set<string>>;
  tabs: Map<string, string>;

  constructor(name: string, description: string, attributes: Map<string, Set<string>> = Map(), tabs: Map<string, string> = Map()) {
    this.name = name;
    this.description = description;
    this.attributes = attributes;
    this.tabs = tabs;
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
      if (vs.some((v) => my.has(v))) n++;
      d++;
    });
    return d == 0 ? 1 : n / d;
  }
}

export class Dataset {
  attributes: Map<string, Set<string>>;
  species: Array<Species>;

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
            this.attributes = this.attributes.update(k, Set(), (set) => set.add(v));
          });
        }
      });
    });
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
