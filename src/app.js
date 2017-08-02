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

  render() {
    const k = this.props.attrKey;
    const anyOn = Array.from(this.props.attrValues).some((v) => this.props.isSelected(k, v));
    const hidden = this.props.shouldHide && !this.state.userOpened
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
                Array.from(this.props.attrValues).sort().map((v) => {
                  const isOn = this.props.isSelected(k, v) || !anyOn;
                  return (
                    <TouchableOpacity style={styles.attributeButton} key={v}
                      onPress={() => this.props.onPressValue(k, v)}
                      onLongPress={() => this.setState({modal: {
                        header: k + ' - ' + v,
                        info: 'Info about the attribute value goes here.'
                      }})}
                    >
                      <Image
                        style={isOn ? styles.attributeImage : [styles.attributeImage, styles.attributeImageOff]}
                        source={getFeatureImage(k, v)}
                      />
                      <Text key={v} style={isOn ? styles.attrOn : styles.attrOff}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  );
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

type AttributesProps = {
  selected: Map<string, Set<string>>,
  updateSelected: (Map<string, Set<string>>) => void,
  goToResults: () => void,
  goToSearch: () => void,
};

class AttributesScreen extends Component<AttributesProps, AttributesProps, void> {
  constructor(props: AttributesProps) {
    super(props);
  }

  static defaultProps = {
    selected: Map(),
    updateSelected: () => {},
    goToResults: () => {},
    goToSearch: () => {},
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
        <TouchableOpacity onPress={this.props.goToSearch}>
          <Text style={styles.attrHeader}>Search</Text>
        </TouchableOpacity>
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
  viewingImage: ?number, // I think this is right for RN require() images
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
    this.state = { tab: 'description', viewingImage: null };
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
              <TouchableOpacity key={img} onPress={() => this.setState({viewingImage: img})}>
                <Image source={img} style={styles.speciesImage} />
              </TouchableOpacity>
            )
          }
        </ScrollView>
        {
          this.state.viewingImage
          ? <Modal>
              <TouchableWithoutFeedback style={{flex: 1}} onPress={() => this.setState({viewingImage: null})}>
                <View style={styles.modalBackgroundBlack}>
                  <Image source={this.state.viewingImage} style={styles.modalImage} />
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          : undefined
        }
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

type SearchProps = {
  search: string,
  name: 'common' | 'binomial-family' | 'binomial-genus',
  onSearch: (string) => void,
  onName: ('common' | 'binomial-genus' | 'binomial-family') => void,
  goBack: () => void,
  goToSpecies: (Species) => void,
};

type SearchState = {
  menuOpen: boolean,
};

class SearchScreen extends Component<SearchProps, SearchProps, SearchState> {
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
      species = dataset.species;
    } else {
      species = dataset.species.filter((spec) => {
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
            <Text style={styles.marginTodo}>Search</Text>
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

export class NomenNative extends Component<void, {}, NomenState> {
  state: NomenState;

  constructor(props: {}) {
    super(props);
    this.state = {
      selected: Map(),
      screen: {tag: 'attributes'},
      search: '',
      name: 'binomial-genus',
    };
  }

  render() {
    switch (this.state.screen.tag) {
      case 'attributes':
        return <AttributesScreen
          selected={this.state.selected}
          updateSelected={(sel) => this.setState({selected: sel})}
          goToResults={() => this.setState({screen: {tag: 'results'}})}
          goToSearch={() => this.setState({screen: {tag: 'search'}})}
        />;
      case 'results':
        return <ResultsScreen
          results={dataset.score(this.state.selected)}
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
        />;
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
    resizeMode: 'cover'
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
});
