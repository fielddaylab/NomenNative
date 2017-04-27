// @flow

import Papa from 'papaparse';

export function readCSV(csv: string): Array<Species> {
  const data: Array<{ [string]: string }> = Papa.parse(csv, {header: true}).data;
  return data.map((row) => {
    const m = new Map();
    for (let k in row) {
      if (k === 'name' || k === 'description') continue;
      m.set(k, new Set(row[k].split(',')));
    }
    return new Species(row.name, row.description, m);
  });
}

export class Species {
  name: string;
  description: string;
  attributes: Map<string, Set<string>>;

  constructor(name: string, description: string, attributes: Map<string, Set<string>>) {
    this.name = name;
    this.description = description;
    this.attributes = attributes;
  }

  lookupKey(key: string): Set<string> {
    return this.attributes.get(key) || new Set();
  }

  score(attrs: Map<string, Set<string>>): number {
    let n: number = 0;
    let d: number = 0;
    attrs.forEach((vs, k) => {
      if (vs.size == 0) return;
      const my = this.lookupKey(k);
      if (vs.values.some((v) => my.has(v))) n++;
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
    const keys: Set<string> = new Set();
    species.forEach((sp) => {
      for (let k of sp.attributes.keys()) {
        keys.add(k);
      }
    });
    this.attributes = new Map();
    keys.forEach((k) => {
      species.forEach((sp) => {
        const vs: ?Set<string> = sp.attributes.get(k);
        if (vs) {
          vs.forEach((v) => {
            const set: ?Set<string> = this.attributes.get(k);
            if (set) {
              set.add(v);
            } else {
              this.attributes.set(k, new Set([v]));
            }
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
