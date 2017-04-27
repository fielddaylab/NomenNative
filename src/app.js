// @flow

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView
} from 'react-native';

import { readCSV, Dataset } from './types';

const dataset = new Dataset( readCSV("name,description,color,size\ndog,it's a dog,brown,big\ncat,it's a cat,\"white,brown\",small") );

export class NomenNative extends Component {
  render() {
    return (
      <View style={styles.outerView}>
        <ScrollView style={styles.scrollAttrs} contentContainerStyle={styles.scrollAttrsContent}>
          {
            Array.from(dataset.attributes).map(([k, vs]) =>
              <View key={k} style={styles.attrSection}>
                <Text style={styles.attrHeader}>{k}</Text>
                <ScrollView horizontal={true} style={styles.attrValues}>
                  {
                    Array.from(vs).map((v) =>
                      <TouchableOpacity key={v}>
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
