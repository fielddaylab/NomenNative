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

type AttributeRowProps = {
  attrKey: string,
  attrValues: Array<string>,
  isSelected: (string, string) => boolean,
  onPressValue: (string, string) => void,
  shouldHide: boolean,
};

type AttributeRowState = {
  userOpened: boolean,
};

class AttributeRow extends Component<void, AttributeRowProps, AttributeRowState> {
  state: AttributeRowState;

  constructor(props) {
    super(props);
    this.state = { userOpened: false };
  }

  componentWillReceiveProps(props) {
    if (!props.shouldHide) {
      this.setState({ userOpened: false });
    }
  }

  render() {
    const k = this.props.attrKey;
    if (this.props.shouldHide && !this.state.userOpened) {
      return (
        <View style={styles.attrSection}>
          <TouchableOpacity onPress={() => this.setState({userOpened: true})}>
            <Text style={styles.attrHeaderGray}>{k.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.attrSection}>
          <Text style={styles.attrHeader}>{k.toUpperCase()}</Text>
          <ScrollView horizontal={true} style={styles.attrValues}>
            {
              Array.from(this.props.attrValues).sort().map((v) =>
                <TouchableOpacity style={styles.attributeButton} key={v} onPress={() => this.props.onPressValue(k, v)}>
                  <Image
                    style={styles.attributeImage}
                    source={getFeatureImage(k, v)}
                  />
                  <Text key={v} style={this.props.isSelected(k, v) ? styles.attrOn : styles.attrOff}>
                    {v}
                  </Text>
                </TouchableOpacity>
              )
            }
          </ScrollView>
        </View>
      );
    }
  }
}

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

  shouldHide(k: string, scored: Array<[Species, number]>): boolean {
    if (this.props.selected.get(k, Set()).size !== 0) {
      return false;
    }
    for (let [species, score] of scored) {
      if (score == 1) {
        if (species.attributes.get(k, Set()).size !== 0) {
          return false;
        }
      }
    }
    return true;
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
              <AttributeRow
                key={k}
                attrKey={k}
                attrValues={vs}
                isSelected={this.isSelected.bind(this)}
                onPressValue={this.press.bind(this)}
                shouldHide={this.shouldHide(k, scored)}
              />
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

type SpeciesState = {
  tab: string,
};

type SpeciesProps = {
  species: Species,
  goToResults: () => void,
};

type SpeciesPropsDef = {
  goToResults: () => void,
};

class SpeciesScreen extends Component<SpeciesPropsDef, SpeciesProps, SpeciesState> {
  static defaultProps = {
    goToResults: () => {},
  };

  state: SpeciesState;

  constructor(props: {}) {
    super(props);
    this.state = { tab: 'description' };
  }

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
        <ScrollView horizontal={true} style={styles.attrValues}>
          {
            ['description'].concat(Array.from(this.props.species.tabs.keys())).map((k) =>
              <TouchableOpacity key={k} onPress={() => this.setState({tab: k})}>
                <Text style={k === this.state.tab ? styles.attrOn : styles.attrOff}>{k}</Text>
              </TouchableOpacity>
            )
          }
        </ScrollView>
        {
          this.state.tab === 'description' ? <View>
            <Text style={styles.marginTodo}>{this.props.species.description}</Text>
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
          </View> : <View>
            <Text style={styles.marginTodo}>
              { this.props.species.tabs.get(this.state.tab) }
            </Text>
          </View>
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
  attrHeaderGray: {
    margin: 10,
    textAlign: 'center',
    color: 'gray',
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
