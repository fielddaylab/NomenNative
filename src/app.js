// @flow

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Map, Set } from 'immutable';
import update from 'immutability-helper';

import { readCSV, Dataset } from './types';

const datasetCSV: string = "name,description,color,size\ndog,it's a dog,brown,big\ncat,it's a cat,\"white,brown\",small";
const dataset = new Dataset( readCSV(datasetCSV) );

type NomenState = {
  selected: Map<string, Set<string>>;
};

export class NomenNative extends Component<void, {}, NomenState> {
  state: NomenState;

  constructor(props: {}) {
    super(props);
    this.state = { selected: Map() };
  }

  press(k: string, v: string): void {
    this.setState((state) => update(state, {
      selected: {
        $apply: (sel) => sel.update(k, Set(), (vs: Set<string>) => vs.has(v) ? vs.delete(v) : vs.add(v))
      }
    }));
  }

  isSelected(k: string, v: string): boolean {
    return this.state.selected.get(k, Set()).has(v);
  }

  anySelection(): boolean {
    return this.state.selected.some((set) => set.size !== 0);
  }

  clearSearch(): void {
    this.setState({selected: Map()});
  }

  render() {
    const scored = dataset.score(this.state.selected);
    let perfect = 0;
    for (let [species, score] of scored) {
      if (score == 1) {
        perfect++;
      } else {
        break;
      }
    }

    return (
      <View style={styles.outerView}>
        <ScrollView style={styles.scrollAttrs} contentContainerStyle={styles.scrollAttrsContent}>
          {
            Array.from(dataset.attributes).map(([k, vs]) =>
              <View key={k} style={styles.attrSection}>
                <Text style={styles.attrHeader}>{k}</Text>
                <ScrollView horizontal={true} style={styles.attrValues}>
                  {
                    Array.from(vs).sort().map((v) =>
                      <TouchableOpacity key={v} onPress={() => this.press(k, v)}>
                        <Text key={v} style={this.isSelected(k, v) ? styles.attrOn : styles.attrOff}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    )
                  }
                </ScrollView>
              </View>
            )
          }
        </ScrollView>
        {
          this.anySelection() ?
            <TouchableOpacity onPress={this.clearSearch.bind(this)}>
              <Text style={styles.attrHeader}>Clear search</Text>
            </TouchableOpacity>
          : undefined
        }
        <Text style={styles.attrHeader}>{perfect} results</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  outerView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: '#E5ECEF',
    marginTop: 20, // TODO
  },
  scrollAttrs: {
    flex: 1,
  },
  scrollAttrsContent: {
  },
  attrSection: {
  },
  attrHeader: {
    margin: 10,
    textAlign: 'center',
  },
  attrValues: {
  },
  attrOn: {
    margin: 10,
    textAlign: 'center',
    color: 'black',
  },
  attrOff: {
    margin: 10,
    textAlign: 'center',
    color: 'gray',
  },
});
