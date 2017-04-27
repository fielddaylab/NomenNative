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

const dataset = new Dataset( readCSV("name,description,color,size\ndog,it's a dog,brown,big\ncat,it's a cat,\"white,brown\",small") );

type NomenState = {
  selected: Map<string, Set<string>>;
};

export class NomenNative extends Component<void, {}, NomenState> {
  state: NomenState;

  constructor(props: {}) {
    super(props);
    this.state = { selected: Map() };
  }

  press(k: string, v: string) {
    this.setState((state) => update(state, {
      selected: {
        $apply: (sel) => sel.update(k, Set(), (vs: Set<string>) => vs.has(v) ? vs.delete(v) : vs.add(v))
      }
    }));
  }

  render() {
    return (
      <View style={styles.outerView}>
        <Text>{JSON.stringify(this.state)}</Text>
        <ScrollView style={styles.scrollAttrs} contentContainerStyle={styles.scrollAttrsContent}>
          {
            Array.from(dataset.attributes).map(([k, vs]) =>
              <View key={k} style={styles.attrSection}>
                <Text style={styles.attrHeader}>{k}</Text>
                <ScrollView horizontal={true} style={styles.attrValues}>
                  {
                    Array.from(vs).map((v) =>
                      <TouchableOpacity key={v} onPress={() => this.press(k, v)}>
                        <Text key={v} style={styles.attrValue}>
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
        <Text>{JSON.stringify( dataset.score(this.state.selected) )}</Text>
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
  attrValue: {
    margin: 10,
    textAlign: 'center',
  },
});
