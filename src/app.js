// @flow

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Navigator,
  Image,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Linking
} from 'react-native';
import Lightbox from 'react-native-lightbox';
import { Map, Set } from 'immutable';
import update from 'immutability-helper';

import mcgee from '../plants/mcgee_A_L';
import conifers from '../plants/conifers';

import { readCSV, Dataset, Species } from './types';
import { getFeatureImage, getSpeciesImages } from './plants';

const mcgee_specs = new Dataset( readCSV(mcgee) );
const conifers_specs = new Dataset( readCSV(conifers) );

type OptionProps = {
  onPress: () => void,
  onModal: () => void,
  image: any,
  value: string,
  active: boolean,
};

class AttributeOption extends Component<void, OptionProps, void> {
  constructor(props: OptionProps) {
    super(props);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.image !== nextProps.image) return true;
    if (this.props.value !== nextProps.value) return true;
    if (this.props.active !== nextProps.active) return true;
    return false;
  }

  render() {
    return (
      <TouchableOpacity style={styles.attributeButton}
        onPress={() => this.props.onPress()}
        onLongPress={() => this.props.onModal()}
      >
        <Image
          style={this.props.active ? styles.attributeImage : [styles.attributeImage, styles.attributeImageOff]}
          source={this.props.image}
        />
        <Text key={this.props.value} style={this.props.active ? styles.attrOn : styles.attrOff}>
          {this.props.value}
        </Text>
      </TouchableOpacity>
    );
  }
}

type AttributeRowProps = {
  attrKey: string,
  attrValues: Array<string>,
  selected: Map<string, Set<string>>,
  onPressValue: (string, string) => void,
  shouldHide: boolean,
  dataset: Dataset,
};

type AttributeRowState = {
  userOpened: boolean,
  modal: ?{header: string, info: string},
};

class AttributeRow extends Component<void, AttributeRowProps, AttributeRowState> {
  state: AttributeRowState;

  constructor(props: AttributeRowProps) {
    super(props);
    this.state = { userOpened: false, modal: null };
  }

  componentWillReceiveProps(props) {
    if (!props.shouldHide) {
      this.setState({ userOpened: false });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.attrKey !== nextProps.attrKey) return true;
    if (this.props.attrValues !== nextProps.attrValues) return true;
    if (this.props.selected !== nextProps.selected) return true;
    if (this.props.shouldHide !== nextProps.shouldHide) return true;
    if (this.props.dataset !== nextProps.dataset) return true;
    if (this.state.userOpened !== nextState.userOpened) return true;
    if (this.state.modal !== nextState.modal) return true;
    return false;
  }

  render() {
    const k = this.props.attrKey;

    const counts = {};
    for (const spec of this.props.dataset.species) {
      for (const v of spec.attributes.get(k, Set())) {
        counts[v] = (counts[v] || 0) + 1;
      }
    }

    function compareAttrValues(a, b) {
      if (k === 'flowering month') {
        const order = ['apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct'];
        return order.indexOf(a) - order.indexOf(b);
      } else if (k === 'plant height') {
        return parseInt(a) - parseInt(b); // will parse the lower bound x from "x to y"
      } else {
        const compareCounts = (counts[b] || 0) - (counts[a] || 0);
        if (compareCounts === 0) {
          return a.localeCompare(b);
        } else {
          return compareCounts;
        }
      }
    }

    const isSelected = (k: string, v: string): boolean => {
      return this.props.selected.get(k, Set()).has(v);
    }
    const anyOn = Array.from(this.props.attrValues).some((v) => isSelected(k, v));
    const hidden = this.props.shouldHide && !this.state.userOpened;
    return (
      <View style={styles.attrSection}>
        <TouchableOpacity
          onPress={() => this.setState({userOpened: true})}
          onLongPress={() => this.setState({modal: {
            header: k,
            info: 'Info about the attribute goes here.'
          }})}
        >
          <Text style={hidden ? styles.attrHeaderGray : styles.attrHeader}>
            {k.toUpperCase()}
          </Text>
        </TouchableOpacity>
        {
          hidden
          ? undefined
          : <ScrollView horizontal={true} style={styles.attrValues}>
              {
                Array.from(this.props.attrValues).sort(compareAttrValues).map((v) => {
                  return <AttributeOption
                    active={isSelected(k, v) || !anyOn}
                    onPress={() => this.props.onPressValue(k, v)}
                    onModal={() => this.setState({modal: {
                      header: k + ' - ' + v,
                      info: 'Info about the attribute value goes here.'
                    }})}
                    image={getFeatureImage(k, v)}
                    key={v}
                    value={v}
                  />;
                })
              }
            </ScrollView>
        }
        {
          this.state.modal == null
          ? undefined
          : <Modal transparent={true}>
              <TouchableWithoutFeedback style={{flex: 1}} onPress={() => this.setState({modal: null})}>
                <View style={styles.modalBackground}>
                  <View style={styles.modalWhiteBox}>
                    <Text style={{margin: 20}}>{this.state.modal.header}</Text>
                    <Text style={{margin: 20}}>{this.state.modal.info}</Text>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
        }
      </View>
    );
  }
}

type AttributesDefaultProps = {
  selected: Map<string, Set<string>>,
  updateSelected: (Map<string, Set<string>>) => void,
  goToResults: () => void,
  goToSearch: () => void,
  onBack: () => void,
};

type AttributesProps = AttributesDefaultProps & {
  dataset: Dataset,
  results: Array<[Species, number]>,
};

class AttributesScreen extends Component<AttributesDefaultProps, AttributesProps, void> {
  constructor(props: AttributesProps) {
    super(props);
  }

  static defaultProps = {
    selected: Map(),
    updateSelected: () => {},
    goToResults: () => {},
    goToSearch: () => {},
    onBack: () => {},
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

  anySelection(): boolean {
    return this.props.selected.some((set) => set.size !== 0);
  }

  clearSearch(): void {
    this.props.updateSelected(Map());
  }

  shouldHide(k: string): boolean {
    if (this.props.selected.get(k, Set()).size !== 0) {
      return false;
    }
    for (let [species, score] of this.props.results) {
      if (score == 1) {
        if (species.attributes.get(k, Set()).size !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  sortRows(rows, scored: Array<[Species, number]>) {
    return rows.sort((a, b) => {
      const simpleOrder = [
        'planttype',
        // conifers columns:
        'growth form',
        'needles',
        'mature cone shape',
        'cone type',
        'needle color',
        'needle petiole',
        'needle cross section',
        'needle length',
        'berry placement',
      ];
      const i = simpleOrder.indexOf(a[0]);
      const j = simpleOrder.indexOf(b[0]);
      if (i !== -1 && j !== -1) return i - j;
      if (i !== -1) return -1;
      if (j !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }

  render() {
    let perfect = 0;
    for (let [species, score] of this.props.results) {
      if (score == 1) {
        perfect++;
      } else {
        break;
      }
    }

    return (
      <View style={styles.outerView}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={this.props.onBack}>
            <Image style={styles.backButton} source={require('../img/back.png')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={this.props.goToSearch}>
            <Text style={styles.attrHeader}>Search</Text>
          </TouchableOpacity>
          <View style={styles.backButton}></View>
        </View>
        <ScrollView style={styles.scrollAttrs} contentContainerStyle={styles.scrollAttrsContent}>
          {
            this.sortRows(Array.from(this.props.dataset.attributes), this.props.results).map(([k, vs]) =>
              <AttributeRow
                key={k}
                attrKey={k}
                attrValues={vs}
                selected={this.props.selected}
                onPressValue={this.press.bind(this)}
                shouldHide={this.shouldHide(k)}
                dataset={this.props.dataset}
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
          <Text style={styles.attrHeader}>{String(perfect)} results</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

type ResultsProps = {
  results: Array<[Species, number]>,
  goBack: () => void,
  goToSpecies: (Species) => void,
};

type ResultsState = {
  menuOpen: boolean,
  name: 'common' | 'binomial',
  layout: 'list' | 'grid',
};

function arrayChunks<T>(ary: Array<T>, chunkLen: number): Array<Array<T>> {
  const chunks = [];
  for (var i = 0; i < ary.length; i += chunkLen) {
    chunks.push(ary.slice(i, i + chunkLen));
  }
  return chunks;
}

class ResultsScreen extends Component<ResultsProps, ResultsProps, ResultsState> {
  static defaultProps = {
    results: [],
    goBack: () => {},
    goToSpecies: () => {},
  };
  state: ResultsState;

  constructor(props: ResultsProps) {
    super(props);
    this.state = {
      menuOpen: false,
      name: 'common',
      layout: 'list',
    };
  }

  toggleMenu() {
    this.setState({menuOpen: !this.state.menuOpen});
  }

  render() {
    return <View style={styles.outerView}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={this.props.goBack}>
          <Image style={styles.backButton} source={require('../img/back.png')} />
        </TouchableOpacity>
        <TouchableOpacity onPress={this.toggleMenu.bind(this)}>
          <Text style={styles.marginTodo}>Results</Text>
        </TouchableOpacity>
        <View style={styles.backButton}></View>
      </View>
      {
        this.state.menuOpen
        ? <View style={styles.topBar}>
            <Text style={styles.marginTodo}>Naming:</Text>
            <TouchableOpacity onPress={() => this.setState({name: 'common'})}>
              <Text style={this.state.name === 'common' ? styles.attrOn : styles.attrOff}>Common</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => this.setState({name: 'binomial'})}>
              <Text style={this.state.name === 'binomial' ? styles.attrOn : styles.attrOff}>Binomial</Text>
            </TouchableOpacity>
          </View>
        : undefined
      }
      {
        this.state.menuOpen
        ? <View style={styles.topBar}>
            <Text style={styles.marginTodo}>Layout:</Text>
            <TouchableOpacity onPress={() => this.setState({layout: 'list'})}>
              <Text style={this.state.layout === 'list' ? styles.attrOn : styles.attrOff}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => this.setState({layout: 'grid'})}>
              <Text style={this.state.layout === 'grid' ? styles.attrOn : styles.attrOff}>Grid</Text>
            </TouchableOpacity>
          </View>
        : undefined
      }
      <ScrollView>
        {
          this.state.layout === 'list'
          ? this.props.results.map(([species, score]) =>
              <TouchableOpacity style={styles.resultsRow} key={species.name} onPress={() => this.props.goToSpecies(species)}>
                {
                  (() => {
                    const imgs = getSpeciesImages(species);
                    return (
                      imgs.length === 0
                      ? <View style={styles.resultsRowImage} />
                      : <Image source={imgs[0]} style={styles.resultsRowImage} />
                    );
                  })()
                }
                <Text style={styles.marginTodo}>
                  {this.state.name === 'common' ? species.displayName : species.name} ({String(Math.floor(score * 100))}%)
                </Text>
              </TouchableOpacity>
            )
          : (() => {
              const makeGridSquare = (maybeSpecScore: ?[Species, number]) => {
                if (maybeSpecScore == null) {
                  return <View style={styles.gridSquare} />
                } else {
                  const [species, score] = maybeSpecScore;
                  const imgs = getSpeciesImages(species);
                  return (
                    <TouchableOpacity style={styles.gridSquare} onPress={() => this.props.goToSpecies(species)}>
                      {
                        imgs.length === 0
                        ? <View style={styles.resultsGridImage} />
                        : <Image source={imgs[0]} style={styles.resultsGridImage} resizeMode="cover" />
                      }
                      <Text style={styles.marginTodo}>
                        {this.state.name === 'common' ? species.displayName : species.name} ({String(Math.floor(score * 100))}%)
                      </Text>
                    </TouchableOpacity>
                  );
                }
              };
              return arrayChunks(this.props.results, 2).map((specs) =>
                <View key={specs[0][0].name} style={styles.gridRow}>
                  {makeGridSquare(specs[0])}
                  {makeGridSquare(specs[1])}
                </View>
              );
            })()
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
  goBack: () => void,
};

type SpeciesPropsDef = {
  goBack: () => void,
};

class SpeciesScreen extends Component<SpeciesPropsDef, SpeciesProps, SpeciesState> {
  static defaultProps = {
    goBack: () => {},
  };

  state: SpeciesState;

  constructor(props: SpeciesProps) {
    super(props);
    this.state = { tab: 'description' };
  }

  render() {
    const imgs = getSpeciesImages(this.props.species);
    return <View style={styles.outerView}>
      <TouchableOpacity onPress={this.props.goBack}>
        <Image style={styles.backButton} source={require('../img/back.png')} />
      </TouchableOpacity>
      <ScrollView>
        <View style={styles.speciesHeader}>
          <View>
            <Text style={styles.speciesCommon}>{this.props.species.displayName}</Text>
            <Text style={styles.speciesBinomial}>{this.props.species.name}</Text>
          </View>
          <View>
            <TouchableOpacity onPress={() => {
              // TODO remember siftr_id from incoming URL
              Linking.openURL('siftr://?siftr_id=6234&nomen_id=1&species_id=' + this.props.species.name);
            }}>
              <Text style={styles.speciesCollect}>collect</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.speciesImageRow} horizontal={true}>
          {
            imgs.map((img) =>
              <Lightbox key={img} activeProps={{style: styles.speciesImageFull}}>
                <Image source={img} style={styles.speciesImage} />
              </Lightbox>
            )
          }
        </ScrollView>
        <ScrollView horizontal={true} style={styles.attrValues}>
          {
            ['description'].concat(Array.from(this.props.species.tabs.keys())).map((k) =>
              <TouchableOpacity key={k} style={k === this.state.tab ? styles.tabOn : styles.tabOff} onPress={() => this.setState({tab: k})}>
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

type SearchDefaultProps = {
  search: string,
  name: 'common' | 'binomial-family' | 'binomial-genus',
  onSearch: (string) => void,
  onName: ('common' | 'binomial-genus' | 'binomial-family') => void,
  goBack: () => void,
  goToSpecies: (Species) => void,
};

type SearchProps = SearchDefaultProps & {
  dataset: Dataset,
};

type SearchState = {
  menuOpen: boolean,
};

class SearchScreen extends Component<SearchDefaultProps, SearchProps, SearchState> {
  static defaultProps = {
    search: '',
    name: 'binomial-genus',
    onSearch: () => {},
    onName: () => {},
    goBack: () => {},
    goToSpecies: () => {},
  };

  state: SearchState;

  constructor(props: SearchProps) {
    super(props);
    this.state = {
      menuOpen: false,
    };
  }

  toggleMenu() {
    this.setState({menuOpen: !this.state.menuOpen});
  }

  results() {
    const words = this.props.search.split(/\s+/).filter((word) => word !== '').map((word) => word.toLowerCase());
    let species;
    if (words.length === 0) {
      species = this.props.dataset.species;
    } else {
      species = this.props.dataset.species.filter((spec) => {
        const name = spec.name.toLowerCase();
        const displayName = spec.displayName.toLowerCase();
        for (const word of words) {
          if (name.indexOf(word) === -1 && displayName.indexOf(word) === -1) {
            return false;
          }
        }
        return true;
      });
    }
    return species.sort((x, y) => {
      switch (this.props.name) {
        case 'common':
          return x.displayName.localeCompare(y.displayName);
        case 'binomial-genus':
          return x.name.localeCompare(y.name);
        case 'binomial-family':
          return x.family.localeCompare(y.family);
        default: // flow is dumb
          return x.name.localeCompare(y.name); // TODO
      }
    });
  }

  render() {
    return (
      <View style={styles.outerView}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={this.props.goBack}>
            <Image style={styles.backButton} source={require('../img/back.png')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={this.toggleMenu.bind(this)}>
            <Text style={styles.attrHeader}>Search</Text>
          </TouchableOpacity>
          <View style={styles.backButton}></View>
        </View>
        {
          this.state.menuOpen
          ? <View style={styles.topBar}>
              <Text style={styles.marginTodo}>Naming:</Text>
              <TouchableOpacity onPress={() => this.props.onName('common')}>
                <Text style={this.props.name === 'common' ? styles.attrOn : styles.attrOff}>Common</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (this.props.name === 'common') {
                  this.props.onName('binomial-genus');
                }
              }}>
                <Text style={this.props.name === 'common' ? styles.attrOff : styles.attrOn}>Binomial</Text>
              </TouchableOpacity>
            </View>
          : undefined
        }
        {
          this.state.menuOpen && this.props.name !== 'common'
          ? <View style={styles.topBar}>
              <Text style={styles.marginTodo}>Group by:</Text>
              <TouchableOpacity onPress={() => this.props.onName('binomial-family')}>
                <Text style={this.props.name === 'binomial-family' ? styles.attrOn : styles.attrOff}>Family</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.props.onName('binomial-genus')}>
                <Text style={this.props.name === 'binomial-genus' ? styles.attrOn : styles.attrOff}>Genus</Text>
              </TouchableOpacity>
            </View>
          : undefined
        }
        <TextInput
          style={styles.searchBar}
          value={this.props.search}
          onChangeText={(text) => this.props.onSearch(text)}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true}
        />
        <ScrollView>
        {
          this.results().map((species) => {
            let scientific = species.name;
            if (this.props.name === 'binomial-family') {
              scientific = '(' + species.family + ') ' + species.name;
            }
            return <TouchableOpacity style={styles.searchRow} key={species.name} onPress={() => this.props.goToSpecies(species)}>
              <Text style={[styles.searchRowPrimary, this.props.name === 'common' ? undefined : styles.searchRowBinomial]}>
                {this.props.name === 'common' ? species.displayName : scientific}
              </Text>
              <Text style={[styles.searchRowSecondary, this.props.name === 'common' ? styles.searchRowBinomial : undefined]}>
                {this.props.name === 'common' ? scientific : species.displayName}
              </Text>
            </TouchableOpacity>;
          })
        }
        </ScrollView>
      </View>
    );
  }
}

type NomenState = {
  selected: Map<string, Set<string>>,
  search: string,
  name: 'common' | 'binomial-genus' | 'binomial-family',
  screen:
    {tag: 'attributes'} |
    {tag: 'results'} |
    {tag: 'species', species: Species, backTo: 'results' | 'search'} |
    {tag: 'search'},
};

type NomenDefaultProps = {
  onBack: () => void,
};

type NomenProps = NomenDefaultProps & {
  dataset: Dataset,
};

class NomenNative extends Component<NomenDefaultProps, NomenProps, NomenState> {
  static defaultProps = {
    onBack: () => {},
  };

  state: NomenState;

  constructor(props: NomenProps) {
    super(props);
    this.state = {
      selected: Map(),
      screen: {tag: 'attributes'},
      search: '',
      name: 'binomial-genus',
    };
  }

  render() {
    const results = this.props.dataset.score(this.state.selected);

    switch (this.state.screen.tag) {
      case 'attributes':
        return <AttributesScreen
          selected={this.state.selected}
          results={results}
          updateSelected={(sel) => this.setState({selected: sel})}
          goToResults={() => this.setState({screen: {tag: 'results'}})}
          goToSearch={() => this.setState({screen: {tag: 'search'}})}
          dataset={this.props.dataset}
          onBack={this.props.onBack}
        />;
      case 'results':
        return <ResultsScreen
          results={results}
          goBack={() => this.setState({screen: {tag: 'attributes'}})}
          goToSpecies={(spec) => this.setState({screen: {tag: 'species', species: spec, backTo: 'results'}})}
        />;
      case 'species':
        const backTo = this.state.screen.backTo;
        return <SpeciesScreen
          species={this.state.screen.species}
          goBack={() => {
            // flow does not understand the obvious version
            switch (backTo) {
              case 'results':
                this.setState({screen: {tag: 'results'}});
                break;
              case 'search':
                this.setState({screen: {tag: 'search'}});
                break;
            }
          }}
        />;
      case 'search':
        return <SearchScreen
          search={this.state.search}
          name={this.state.name}
          onSearch={(search) => this.setState({search: search})}
          onName={(name) => this.setState({name: name})}
          goBack={() => this.setState({screen: {tag: 'attributes'}})}
          goToSpecies={(spec) => this.setState({screen: {tag: 'species', species: spec, backTo: 'search'}})}
          dataset={this.props.dataset}
        />;
    }
  }
}

type HomeState = {
  dataset: 'conifers' | 'prairie' | null,
};

export class HomeScreen extends Component<void, {}, HomeState> {
  state: HomeState;

  constructor(props: {}) {
    super(props);
    this.state = {
      dataset: null,
    };
  }

  render() {
    switch (this.state.dataset) {
      case 'conifers':
        return <NomenNative dataset={conifers_specs} onBack={() => this.setState({dataset: null})} />;
      case 'prairie':
        return <NomenNative dataset={mcgee_specs} onBack={() => this.setState({dataset: null})} />;
      case null:
        return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <TouchableOpacity style={styles.homeSelect} onPress={() => this.setState({dataset: 'conifers'})}>
            <Text style={styles.homeSelectText}>Conifers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeSelect} onPress={() => this.setState({dataset: 'prairie'})}>
            <Text style={styles.homeSelectText}>Prairie Plants</Text>
          </TouchableOpacity>
        </View>;
    }
  }
}

const styles = StyleSheet.create({
  outerView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: 'white',
    marginTop: 20, // TODO actually set this up for ios+android
  },
  scrollAttrs: {
    flex: 1,
  },
  scrollAttrsContent: {
  },
  attrSection: {
    borderBottomColor: '#F4F4F4',
    borderBottomWidth: 2,
  },
  attrHeader: {
    margin: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  attrHeaderGray: {
    margin: 10,
    textAlign: 'center',
    color: 'gray',
  },
  attrValues: {
    marginLeft: 12,
    marginRight: 12,
  },
  attrOn: {
    margin: 10,
    textAlign: 'center',
    color: 'black',
  },
  attrOff: {
    margin: 10,
    textAlign: 'center',
    color: '#bbb',
  },
  marginTodo: {
    margin: 10,
  },
  attributeImage: {
    height: 40,
    width: 40,
  },
  attributeImageOff: {
    opacity: 0.7
  },
  attributeButton: {
    alignItems: 'center',
    flexDirection: 'column',
  },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexDirection: 'row',
    borderBottomColor: '#F4F4F4',
    borderBottomWidth: 2,
  },
  hidden: {
    opacity: 0
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsRowImage: {
    height: 50,
    width: 50,
    margin: 2,
  },
  backButton: {
    margin: 10,
    height: 44 * 0.4,
    width: 60 * 0.4,
  },
  modalBackground: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
  },
  modalBackgroundBlack: {
    backgroundColor: 'black',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalWhiteBox: {
    backgroundColor: 'white',
    margin: 60,
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speciesCommon: {
    margin: 10,
    marginBottom: 3,
    fontSize: 20,
  },
  speciesBinomial: {
    margin: 10,
    marginTop: 3,
    color: '#E7A740',
    fontStyle: 'italic',
  },
  tabOn: {
    borderBottomWidth: 2,
    borderBottomColor: '#C7C7C7',
  },
  tabOff: {
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridSquare: {
    flex: 1,
    flexDirection: 'column',
  },
  resultsGridImage: {
    flex: 1,
    height: 200,
    width: null,
  },
  searchBar: {
    height: 40,
    margin: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderColor: '#C7C7C7',
    borderWidth: 2,
  },
  searchRow: {
  },
  searchRowPrimary: {
    color: '#E7A740',
    fontSize: 18,
    marginLeft: 10,
    marginTop: 7,
    marginBottom: 2,
    marginRight: 10,
  },
  searchRowSecondary: {
    color: '#B0ADAD',
    fontSize: 13,
    marginLeft: 30,
    marginTop: 2,
    marginBottom: 7,
    marginRight: 10,
  },
  searchRowBinomial: {
    fontStyle: 'italic',
  },
  speciesImageRow: {
    flexDirection: 'row',
  },
  speciesImage: {
    height: 200,
    width: 150,
    resizeMode: 'cover',
  },
  speciesImageFull: {
    height: null,
    width: null,
    resizeMode: 'contain',
    flex: 1,
  },
  modalImage: {
    flex: 1,
    resizeMode: 'contain'
  },
  speciesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  speciesCollect: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    margin: 10,
    borderColor: '#E7A740',
    borderWidth: 1,
    borderRadius: 15,
    color: '#E7A740',
  },
  homeSelect: {
    margin: 20,
  },
  homeSelectText: {
    fontSize: 20,
  },
});
