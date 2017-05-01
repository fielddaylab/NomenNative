// @flow

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Navigator,
  Image
} from 'react-native';
import { Map, Set } from 'immutable';
import update from 'immutability-helper';

import { readCSV, Dataset, Species } from './types';
import { plants_csv, getFeatureImage, getSpeciesImages } from './plants';

const dataset = new Dataset( readCSV(plants_csv) );

type AttributesProps = {
  selected: Map<string, Set<string>>,
  updateSelected: (Map<string, Set<string>>) => void,
  goToResults: () => void,
};

class AttributesScreen extends Component<AttributesProps, AttributesProps, void> {
  constructor(props: AttributesProps) {
    super(props);
  }

  static defaultProps = {
    selected: Map(),
    updateSelected: () => {},
    goToResults: () => {},
  };

  press(k: string, v: string): void {
    this.props.updateSelected(
      this.props.selected.update(
        k,
        Set(),
        (vs: Set<string>) => vs.has(v) ? vs.delete(v) : vs.add(v)
      )
    );
  }

  isSelected(k: string, v: string): boolean {
    return this.props.selected.get(k, Set()).has(v);
  }

  anySelection(): boolean {
    return this.props.selected.some((set) => set.size !== 0);
  }

  clearSearch(): void {
    this.props.updateSelected(Map());
  }

  render() {
    const scored = dataset.score(this.props.selected);
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
                      <TouchableOpacity style={styles.attributeButton} key={v} onPress={() => this.press(k, v)}>
                        <Image
                          style={styles.attributeImage}
                          source={getFeatureImage(k, v)}
                        />
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
        <TouchableOpacity onPress={this.props.goToResults}>
          <Text style={styles.attrHeader}>{perfect} results</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

type ResultsProps = {
  results: Array<[Species, number]>,
  goToAttributes: () => void,
  goToSpecies: (Species) => void,
};

class ResultsScreen extends Component<ResultsProps, ResultsProps, void> {
  static defaultProps = {
    results: [],
    goToAttributes: () => {},
    goToSpecies: () => {},
  };

  render() {
    return <View style={styles.outerView}>
      <TouchableOpacity onPress={this.props.goToAttributes}>
        <Text style={styles.marginTodo}>Back to attributes</Text>
      </TouchableOpacity>
      <ScrollView>
        {
          this.props.results.map(([species, score]) =>
            <TouchableOpacity key={species.name} onPress={() => this.props.goToSpecies(species)}>
              <Text style={styles.marginTodo}>{species.name} ({Math.floor(score * 100)}%)</Text>
            </TouchableOpacity>
          )
        }
      </ScrollView>
    </View>;
  }
}

type SpeciesProps = {
  species: Species,
  goToResults: () => void,
};

type SpeciesPropsDef = {
  goToResults: () => void,
};

class SpeciesScreen extends Component<SpeciesPropsDef, SpeciesProps, void> {
  static defaultProps = {
    goToResults: () => {},
  };

  render() {
    const imgs = getSpeciesImages(this.props.species);
    return <View style={styles.outerView}>
      <TouchableOpacity onPress={this.props.goToResults}>
        <Text style={styles.marginTodo}>Back to results</Text>
      </TouchableOpacity>
      <ScrollView>
        <Text style={styles.marginTodo}>Name: {this.props.species.name}</Text>
        {
          imgs.length === 0 ? undefined : (
            <Image source={imgs[0]} />
          )
        }
        <Text style={styles.marginTodo}>Description: {this.props.species.description}</Text>
        {
          Array.from(this.props.species.attributes).map(([k, v]) =>
            <Text style={styles.marginTodo} key={k}>
              {k}: {v.join(', ')}
            </Text>
          )
        }
        {
          Array.from(this.props.species.tabs).map(([k, v]) =>
            <Text style={styles.marginTodo} key={k}>
              {k}: {v}
            </Text>
          )
        }
      </ScrollView>
    </View>;
  }
}

type NomenState = {
  selected: Map<string, Set<string>>,
  screen:
    {tag: 'attributes'} |
    {tag: 'results'} |
    {tag: 'species', species: Species},
};

export class NomenNative extends Component<void, {}, NomenState> {
  state: NomenState;

  constructor(props: {}) {
    super(props);
    this.state = { selected: Map(), screen: {tag: 'attributes'} };
  }

  render() {
    switch (this.state.screen.tag) {
      case 'attributes':
        return <AttributesScreen
          selected={this.state.selected}
          updateSelected={(sel) => this.setState({selected: sel})}
          goToResults={() => this.setState({screen: {tag: 'results'}})}
        />;
      case 'results':
        return <ResultsScreen
          results={dataset.score(this.state.selected)}
          goToAttributes={() => this.setState({screen: {tag: 'attributes'}})}
          goToSpecies={(spec) => this.setState({screen: {tag: 'species', species: spec}})}
        />;
      case 'species':
        return <SpeciesScreen
          species={this.state.screen.species}
          goToResults={() => this.setState({screen: {tag: 'results'}})}
        />;
    }
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
  marginTodo: {
    margin: 10,
  },
  attributeImage: {
    height: 40,
    width: 40,
  },
  attributeButton: {
    alignItems: 'center',
    flexDirection: 'column',
  },
});
