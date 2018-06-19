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
  Linking,
  Platform,
  BackHandler
} from 'react-native';
import Lightbox from 'react-native-lightbox';
import { Map, Set } from 'immutable';
import update from 'immutability-helper';

import mcgee from '../plants/mcgee_A_L';
import conifers from '../plants/conifers';
import broadleaf from '../plants/broadleaf_trees';

import { readCSV, Dataset, Species } from './types';
import { getFeatureImage, getSpeciesImages, glossary } from './plants';

const mcgee_specs = new Dataset( readCSV(mcgee) );
const conifers_specs = new Dataset( readCSV(conifers) );
const broadleaf_specs = new Dataset( readCSV(broadleaf) );

type OptionProps = {
  onPress: () => void,
  onModal: () => void,
  image: any,
  attribute: string,
  value: string,
  active: boolean,
  available: boolean,
};

class AttributeOption extends Component<void, OptionProps, void> {
  constructor(props: OptionProps) {
    super(props);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.image !== nextProps.image) return true;
    if (this.props.value !== nextProps.value) return true;
    if (this.props.active !== nextProps.active) return true;
    if (this.props.available !== nextProps.available) return true;
    return false;
  }

  render() {
    const style = this.props.active || this.props.available ? styles.attributeImage : [styles.attributeImage, styles.attributeImageOff];
    let img = <Image style={style} source={this.props.image} />;
    if (this.props.attribute === 'needle color') {
      if (this.props.value === 'green') img = <View style={[style, {backgroundColor: 'rgb(0,102,0)'}]} />;
      else if (this.props.value === 'bluish green') img = <View style={[style, {backgroundColor: 'rgb(53,115,94)'}]} />;
      else if (this.props.value === 'yellow') img = <View style={[style, {backgroundColor: 'rgb(255,229,153)'}]} />;
    } else if (this.props.attribute === 'flower color') {
      if (this.props.value === 'white') img = <View style={[style, {backgroundColor: '#eee'}]} />;
      else if (this.props.value === 'purple') img = <View style={[style, {backgroundColor: 'rgb(145,45,141)'}]} />;
      else if (this.props.value === 'pink') img = <View style={[style, {backgroundColor: 'rgb(253,111,194)'}]} />;
      else if (this.props.value === 'yellow') img = <View style={[style, {backgroundColor: 'rgb(254,240,53)'}]} />;
      else if (this.props.value === 'green') img = <View style={[style, {backgroundColor: 'rgb(23,165,85)'}]} />;
      else if (this.props.value === 'blue') img = <View style={[style, {backgroundColor: 'rgb(29,175,236)'}]} />;
      else if (this.props.value === 'orange') img = <View style={[style, {backgroundColor: 'rgb(240,101,48)'}]} />;
      else if (this.props.value === 'red') img = <View style={[style, {backgroundColor: 'rgb(234,33,45)'}]} />;
    } else if (this.props.attribute === 'fall color') {
      if (this.props.value === 'yellow') img = <View style={[style, {backgroundColor: 'rgb(255,255,102)'}]} />;
      else if (this.props.value === 'orange') img = <View style={[style, {backgroundColor: 'rgb(255,153,0)'}]} />;
      else if (this.props.value === 'red') img = <View style={[style, {backgroundColor: 'rgb(246,77,64)'}]} />;
      else if (this.props.value === 'yellow-green') img = <View style={[style, {backgroundColor: 'rgb(238,252,170)'}]} />;
      else if (this.props.value === 'brown') img = <View style={[style, {backgroundColor: 'rgb(153,102,51)'}]} />;
      else if (this.props.value === 'burgundy') img = <View style={[style, {backgroundColor: 'rgb(165,0,33)'}]} />;
      else if (this.props.value === 'copper') img = <View style={[style, {backgroundColor: 'black'}]} />; // TODO
      else if (this.props.value === 'salmon') img = <View style={[style, {backgroundColor: 'rgb(255,174,133)'}]} />;
      else if (this.props.value === 'silvery') img = <View style={[style, {backgroundColor: 'black'}]} />; // TODO
    }
    return (
      <TouchableOpacity
        onPress={() => this.props.onPress()}
        onLongPress={() => this.props.onModal()}
        style={[styles.attributeButton, this.props.active ? styles.attrButtonSelected : styles.attrButtonUnselected]}
      >
        {img}
        <Text key={this.props.value} style={this.props.active || this.props.available ? styles.attrAvailable : styles.attrOff}>
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
  dataset: Dataset,
  results: Array<[Species, number]>,
};

type AttributeRowState = {
  modal: ?{header: string, info: string, image?: any},
};

class AttributeRow extends Component<void, AttributeRowProps, AttributeRowState> {
  state: AttributeRowState;

  constructor(props: AttributeRowProps) {
    super(props);
    this.state = { userOpened: false, modal: null };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.attrKey !== nextProps.attrKey) return true;
    if (this.props.attrValues !== nextProps.attrValues) return true;
    if (this.props.selected !== nextProps.selected) return true;
    if (this.props.dataset !== nextProps.dataset) return true;
    if (this.props.results !== nextProps.results) return true;
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
      } else if (k === 'leaflet number') {
        if (a[0] === '>') {
          if (b[0] === '>') {
            return 0;
          } else {
            return 1;
          }
        } else {
          if (b[0] === '>') {
            return -1;
          } else {
            return parseInt(a) - parseInt(b);
          }
        }
      } else if (k === 'needle length') {
        const order = ['<1/2"', '1/2 - 1"', '1 - 2"', '<4"', '>4"'];
        return order.indexOf(a) - order.indexOf(b);
      } else if (k === 'number flower parts') {
        return a.localeCompare(b);
      } else {
        const compareCounts = (counts[b] || 0) - (counts[a] || 0);
        if (compareCounts === 0) {
          return a.localeCompare(b);
        } else {
          return compareCounts;
        }
      }
    }

    let perfect = [];
    for (let [species, score] of this.props.results) {
      if (score == 1) {
        perfect.push(species);
      } else {
        break;
      }
    }

    const isSelected = (k: string, v: string): boolean => {
      return this.props.selected.get(k, Set()).has(v);
    }
    const isAvailable = (k: string, v: string): boolean => {
      return perfect.some((spec) => spec.lookupKey(k).has(v));
    }
    const anyOn = Array.from(this.props.attrValues).some((v) => isSelected(k, v));
    return (
      <View style={styles.attrSection}>
        <TouchableOpacity
          onLongPress={() => this.setState({modal: {
            header: k,
            info: ''
          }})}
        >
          <Text style={styles.attrHeader}>
            {k.toUpperCase()}
          </Text>
        </TouchableOpacity>
        {
          <ScrollView horizontal={true} style={styles.attrValues} contentContainerStyle={{alignItems: 'flex-end'}}>
            {
              Array.from(this.props.attrValues).sort(compareAttrValues).map((v) => {
                const img = getFeatureImage(k, v);
                return <AttributeOption
                  active={isSelected(k, v)}
                  available={isAvailable(k, v)}
                  onPress={() => this.props.onPressValue(k, v)}
                  onModal={() => this.setState({modal: {
                    header: k + ' - ' + v,
                    info: '',
                    image: img,
                  }})}
                  image={img}
                  key={v}
                  attribute={k}
                  value={v}
                />;
              })
            }
          </ScrollView>
        }
        {
          this.state.modal == null
          ? undefined
          : <Modal transparent={true} onRequestClose={() => this.setState({modal: null})}>
              <TouchableWithoutFeedback style={{flex: 1}} onPress={() => this.setState({modal: null})}>
                <View style={styles.modalBackground}>
                  <View style={styles.modalWhiteBox}>
                    {
                      this.state.modal.image == null ? undefined :
                        <Image
                          source={this.state.modal.image}
                          style={{
                            resizeMode: 'contain',
                            height: 150,
                            width: 150,
                          }}
                        />
                    }
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

type CollapsedRowsProps = {
  rows: Array<string>,
  onOpen: () => void,
};

class CollapsedRows extends Component<void, CollapsedRowsProps, void> {
  render() {
    return (
      <View style={styles.attrSection}>
        <TouchableOpacity
          onPress={this.props.onOpen}
        >
          <Text style={styles.attrHeaderGray}>
            {this.props.rows.length} {this.props.rows.length === 1 ? 'row' : 'rows'} hidden
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

type AttributesDefaultProps = {
  selected: Map<string, Set<string>>,
  updateSelected: (Map<string, Set<string>>) => void,
  goToResults: () => void,
  goToSearch: () => void,
  goBack: () => void,
};

type AttributesProps = AttributesDefaultProps & {
  dataset: Dataset,
  results: Array<[Species, number]>,
};

type AttributesState = {
  userOpened: Set<string>,
};

class AttributesScreen extends Component<AttributesDefaultProps, AttributesProps, AttributesState> {
  constructor(props: AttributesProps) {
    super(props);
    this.state = {
      userOpened: Set(),
    };
  }
  state: AttributesState;

  backHandler: () => boolean;
  componentDidMount() {
    this.backHandler = () => {
      this.props.goBack();
      return true;
    };
    if (BackHandler != null) BackHandler.addEventListener('hardwareBackPress', this.backHandler);
  }
  componentWillUnmount() {
    if (BackHandler != null) BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
  }

  static defaultProps = {
    selected: Map(),
    updateSelected: () => {},
    goToResults: () => {},
    goToSearch: () => {},
    goBack: () => {},
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
    this.setState({userOpened: Set()});
  }

  hidden: Set<string>;
  computeHidden() {
    const keys = [];
    for (const k of this.props.dataset.attributes.keys()) {
      const hidden = (() => {
        if (this.state.userOpened.has(k)) {
          return false;
        }
        if (this.props.selected.get(k, Set()).size !== 0) {
          return false;
        }
        for (let [species, score] of this.props.results) {
          if (score !== 1) break;
          if (species.attributes.get(k, Set()).size !== 0) {
            return false;
          }
        }
        return true;
      })();
      if (hidden) keys.push(k);
    }
    this.hidden = Set(keys);
  }

  shouldHide(k: string): boolean {
    return this.hidden.has(k);
  }

  sortRows(rows, scored: Array<[Species, number]>) {
    let order;
    if (rows.some((row) => row[0] === 'berry placement')) {
      // conifers
      order = [
        'growth form',
        'needles',
        'cone type',
        'cone size',
        'needle color',
        'needle petiole',
        'needle cross section',
        'needle length',
        'berry placement',
        'cone scale texture',
        'cone placement',
        'twig hair',
        'branchlets',
      ];
    } else if (rows.some((row) => row[0] === 'leaf length width ratio')) {
      // broadleaf
      order = [
        'leaf arrangement',
        'leaf type',
        'leaf shape',
        'leaflet number',
        'leaflet shape',
        'leaflet stalk',
        'leaf margin',
        'leaf or leaflet venation',
        'maple sinus shape',
        'leaf length width ratio',
        'petiole cross section',
        'asymmetrical leaf base?',
        'leaf upper surface texture',
        'leaf lower surface texture',
        'milky sap present',
        'thorns on twig',
        'flower type',
        'flower color',
        'flower symmetry',
        'fruit type',
        'ripe fruit color',
        'bark texture',
        'fall color',
        'special bark color?',
      ];
    } else {
      // mcgee
      order = [
        'flower color',
        'flower arrangement',
        'flower symmetry',
        'number flower parts',
        'flowering month',
        'leaf arrangement',
        'leaf type',
        'leaf shape',
        'leaf margin',
        'petiole present',
        'leaf venation',
        'stem shape',
        'stem texture',
        'plant height',
        'growth form',
        'distribution',
      ];
    }
    return rows.sort((a, b) => {
      const i = order.indexOf(a[0]);
      const j = order.indexOf(b[0]);
      if (i !== -1 && j !== -1) return i - j;
      if (i !== -1) return -1;
      if (j !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }

  computeRowCollapse() {
    const self = this;
    const elements = [];
    const rows = this.sortRows(Array.from(this.props.dataset.attributes), this.props.results);
    let i = 0;
    while (i < rows.length) {
      const [k, vs] = rows[i];
      if (!this.shouldHide(k)) {
        elements.push(<AttributeRow
          key={k}
          attrKey={k}
          attrValues={vs}
          selected={this.props.selected}
          onPressValue={this.press.bind(this)}
          dataset={this.props.dataset}
          results={this.props.results}
        />);
        i++;
      } else {
        const collapsed = [k];
        i++;
        while (i < rows.length) {
          const [k2, vs2] = rows[i];
          if (this.shouldHide(k2)) {
            collapsed.push(k2);
          } else {
            break;
          }
          i++;
        }
        elements.push(<CollapsedRows
          key={collapsed.join('|')}
          rows={collapsed}
          onOpen={() => {
            self.setState({userOpened: self.state.userOpened.union(collapsed)})
          }}
        />);
      }
    }
    return elements;
  }

  render() {
    this.computeHidden();

    let perfect = 0;
    for (let [species, score] of this.props.results) {
      if (score == 1) {
        perfect++;
      } else {
        break;
      }
    }

    const self = this;
    return (
      <View style={styles.outerView}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={this.props.goBack}>
            <Image style={styles.backButton} source={require('../img/back.png')} />
          </TouchableOpacity>
          <Text style={styles.attrHeader}>Identify</Text>
          <TouchableOpacity onPress={this.props.goToSearch}>
            <Image style={styles.searchButton} source={require('../img/search.png')} />
          </TouchableOpacity>
        </View>
        <ScrollView style={[styles.scrollAttrs, {elevation: 1}]} contentContainerStyle={styles.scrollAttrsContent}>
          {
            this.computeRowCollapse()
          }
        </ScrollView>
        <View style={{
          backgroundColor: 'white',
          // android
          elevation: 20,
          // ios
          shadowOffset: {width: 0, height: 5},
          shadowColor: 'black',
          shadowOpacity: 1,
          shadowRadius: 5,
        }}>
          <Text style={[styles.attrHeader, {fontWeight: 'bold'}]}>{String(perfect)} {perfect === 1 ? 'RESULT' : 'RESULTS'}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 7}}>
            <TouchableOpacity style={{flex: 1}} onPress={this.clearSearch.bind(this)}>
              {
                this.anySelection()
                ? <Text style={[styles.attrHeader, {color: 'rgb(188,188,188)'}]}>clear selections</Text>
                : undefined
              }
            </TouchableOpacity>
            <View style={{
              backgroundColor: 'rgb(238,238,238)',
              height: 20,
              width: 2,
            }} />
            <TouchableOpacity style={{flex: 1}} onPress={this.props.goToResults}>
              <Text style={styles.attrHeader}>view results</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      layout: 'grid',
    };
  }

  backHandler: () => boolean;
  componentDidMount() {
    this.backHandler = () => {
      this.props.goBack();
      return true;
    };
    if (BackHandler != null) BackHandler.addEventListener('hardwareBackPress', this.backHandler);
  }
  componentWillUnmount() {
    if (BackHandler != null) BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
  }

  toggleMenu() {
    this.setState({menuOpen: !this.state.menuOpen});
  }

  render() {
    const possibleIndex = this.props.results.findIndex(([species, score]) => score < 1);
    const perfect = possibleIndex === -1 ? this.props.results : this.props.results.slice(0, possibleIndex);
    const notPerfect = possibleIndex === -1 ? [] : this.props.results.slice(possibleIndex);
    const unlikelyIndex = notPerfect.findIndex(([species, score]) => score < 0.8);
    const possible = unlikelyIndex === -1 ? notPerfect : notPerfect.slice(0, unlikelyIndex);
    const unlikely = unlikelyIndex === -1 ? [] : notPerfect.slice(unlikelyIndex);
    const resultsGroups = [];
    if ( perfect.length > 0) { resultsGroups.push({groupHeader:  'PERFECT MATCHES', groupSpecies:  perfect}); }
    if (possible.length > 0) { resultsGroups.push({groupHeader: 'POSSIBLE MATCHES', groupSpecies: possible}); }
    if (unlikely.length > 0) { resultsGroups.push({groupHeader: 'UNLIKELY MATCHES', groupSpecies: unlikely}); }

    function makeGroupHeader(str) {
      return (
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderDecoration} />
          <Text style={styles.groupHeaderText}>{str}</Text>
          <View style={styles.groupHeaderDecoration} />
        </View>
      );
    }

    return <View style={styles.outerView}>
      <View style={styles.topBarMulti}>
        <View style={styles.topBarMultiRow}>
          <TouchableOpacity onPress={this.props.goBack}>
            <Image style={styles.backButton} source={require('../img/back.png')} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.expandHeader} onPress={this.toggleMenu.bind(this)}>
            <Text style={styles.attrHeader}>Results</Text>
            <Image source={require('../img/arrow-down.png')} style={styles.downButton} />
          </TouchableOpacity>
          <View style={styles.backButton}></View>
        </View>
        {
          this.state.menuOpen
          ? <View style={styles.resultsDrawer}>
              <View style={styles.resultsDrawerHeader}>
                <Text style={styles.resultsDrawerHeaderText}>Naming</Text>
              </View>
              <View style={styles.resultsDrawerRow}>
                <TouchableOpacity onPress={() => this.setState({name: 'common'})}>
                  <View style={this.state.name === 'common' ? styles.resultsOptionOn : styles.resultsOptionOff}>
                    <Text style={styles.resultsOptionText}>common</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.setState({name: 'binomial'})}>
                  <View style={this.state.name === 'binomial' ? styles.resultsOptionOn : styles.resultsOptionOff}>
                    <Text style={styles.resultsOptionText}>binomial</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.resultsDrawerHeader}>
                <Text style={styles.resultsDrawerHeaderText}>Layout</Text>
              </View>
              <View style={styles.resultsDrawerRow}>
                <TouchableOpacity onPress={() => this.setState({layout: 'grid'})}>
                  <Image style={styles.resultsOptionIcon} source={this.state.layout === 'grid' ? require('../img/grid.png') : require('../img/grid-off.png')} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.setState({layout: 'list'})}>
                  <Image style={styles.resultsOptionIcon} source={this.state.layout === 'list' ? require('../img/list.png') : require('../img/list-off.png')} />
                </TouchableOpacity>
              </View>
            </View>
          : undefined
        }
      </View>
      <ScrollView>
        {
          this.state.layout === 'list'
          ? resultsGroups.map(({groupHeader, groupSpecies}) =>
              <View key={groupHeader}>
                { makeGroupHeader(groupHeader) }
                {
                  groupSpecies.map(([species, score]) =>
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
                        {this.state.name === 'common' ? species.displayName : species.name}
                      </Text>
                    </TouchableOpacity>
                  )
                }
              </View>
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
                        {this.state.name === 'common' ? species.displayName : species.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              };
              return resultsGroups.map(({groupHeader, groupSpecies}) =>
                <View key={groupHeader}>
                  { makeGroupHeader(groupHeader) }
                  {
                    arrayChunks(groupSpecies, 2).map((specs) =>
                      <View key={specs[0][0].name} style={styles.gridRow}>
                        {makeGridSquare(specs[0])}
                        {makeGridSquare(specs[1])}
                      </View>
                    )
                  }
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
  modal: ?{header: string, info: string},
};

type SpeciesPropsDef = {
  goBack: () => void,
  openSpecies: (Species) => void,
  viola: boolean,
  onViolaCollect: ({nomen_id: number, species_id: string}) => void,
};

type SpeciesProps = SpeciesPropsDef & {
  species: Species,
  dataset: Dataset,
};

function addGlossaryTerms(text, onModal) {
  const words = text.split(/\s+/).map((word, i) => {
    const lookup = word.replace(/[^A-Za-z]/g, '').toLowerCase();
    const lookup2 = lookup.match(/s$/) ? lookup.slice(0, lookup.length - 1) : lookup + 's';
    const defn = glossary[lookup];
    if (defn) {
      return [<Text key={i} style={{color: 'blue'}} onPress={() => onModal(lookup, defn)}>{word}</Text>, ' '];
    } else {
      const defn2 = glossary[lookup2];
      if (defn2) {
        return [<Text key={i} style={{color: 'blue'}} onPress={() => onModal(lookup2, defn2)}>{word}</Text>, ' '];
      } else {
        return word + ' ';
      }
    }
  });
  return <Text>{words}</Text>;
}

function addSpeciesLinks(text, dataset, openSpecies) {
  let parts = [text];
  dataset.species.forEach((species) => {
    let newParts = [];
    parts.forEach((part) => {
      if (typeof part === 'string') {
        const segments = part.split(new RegExp(species.name, 'i'));
        for (var i = 0; i < segments.length; i++) {
          newParts.push(segments[i]);
          if (i !== segments.length - 1) {
            newParts.push(<Text style={{color: 'blue'}} onPress={() => openSpecies(species)}>{species.name}</Text>);
          }
        }
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });
  return React.createElement(Text, null, ...parts);
}

class SpeciesScreen extends Component<SpeciesPropsDef, SpeciesProps, SpeciesState> {
  static defaultProps = {
    goBack: () => {},
    openSpecies: () => {},
    viola: false,
    onViolaCollect: () => {},
  };

  state: SpeciesState;

  constructor(props: SpeciesProps) {
    super(props);
    this.state = { tab: 'description', modal: null };
  }

  backHandler: () => boolean;
  componentDidMount() {
    this.backHandler = () => {
      this.props.goBack();
      return true;
    };
    if (BackHandler != null) BackHandler.addEventListener('hardwareBackPress', this.backHandler);
  }
  componentWillUnmount() {
    if (BackHandler != null) BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
  }

  render() {
    const self = this;
    const imgs = getSpeciesImages(this.props.species);
    const gloss = (text) => addGlossaryTerms(text, (word, defn) => this.setState({modal: {header: word, info: defn}}));
    const lookalikes = (text) => addSpeciesLinks(text, this.props.dataset, this.props.openSpecies);
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
            {
              this.props.viola ? (
                <TouchableOpacity onPress={() => {
                  this.props.onViolaCollect({nomen_id: 1, species_id: this.props.species.name});
                }}>
                  <Text style={styles.speciesCollect}>collect</Text>
                </TouchableOpacity>
              ) : undefined
            }
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
            <Text style={styles.marginTodo}>{gloss(this.props.species.description)}</Text>
            {
              (function(){
                const attrRows = [];
                for (const [k, v] of Array.from(self.props.species.attributes)) {
                  if (v.size === 0) continue;
                  attrRows.push(
                    <Text style={styles.marginTodo} key={k}>
                      { gloss(`${k}: ${v.join(', ')}`) }
                    </Text>
                  );
                }
                return attrRows;
              })()
            }
          </View> : this.state.tab === 'look-alikes' ? <View>
            <Text style={styles.marginTodo}>
              { lookalikes(this.props.species.tabs.get(this.state.tab)) }
            </Text>
          </View> : <View>
            <Text style={styles.marginTodo}>
              { gloss(this.props.species.tabs.get(this.state.tab)) }
            </Text>
          </View>
        }
      </ScrollView>
      {
        this.state.modal == null
        ? undefined
        : <Modal transparent={true} onRequestClose={() => this.setState({modal: null})}>
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

  backHandler: () => boolean;
  componentDidMount() {
    this.backHandler = () => {
      this.props.goBack();
      return true;
    };
    if (BackHandler != null) BackHandler.addEventListener('hardwareBackPress', this.backHandler);
  }
  componentWillUnmount() {
    if (BackHandler != null) BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
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
  goBack: () => void,
  viola: bool,
  onViolaCollect: ({nomen_id: number, species_id: string}) => void,
};

type NomenProps = NomenDefaultProps & {
  dataset: Dataset,
};

class NomenNative extends Component<NomenDefaultProps, NomenProps, NomenState> {
  static defaultProps = {
    goBack: () => {},
    viola: false,
    onViolaCollect: () => {},
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
          goBack={this.props.goBack}
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
          viola={this.props.viola}
          onViolaCollect={this.props.onViolaCollect}
          species={this.state.screen.species}
          dataset={this.props.dataset}
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
          openSpecies={(species) => {
            this.setState({screen: {
              tag: 'species',
              species: species,
              backTo: backTo,
            }});
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
  dataset: 'conifers' | 'prairie' | 'broadleaf' | null,
};

type HomeDefaultProps = {
  viola: boolean,
  backToViola: () => void,
  onViolaCollect: ({nomen_id: number, species_id: string}) => void,
};

export class HomeScreen extends Component<HomeDefaultProps, HomeDefaultProps, HomeState> {
  state: HomeState;

  static defaultProps = {
    viola: false,
    backToViola: () => {},
    onViolaCollect: () => {},
  };

  constructor(props: {}) {
    super(props);
    this.state = {
      dataset: null,
    };
  }

  backHandler: () => boolean;
  componentDidMount() {
    this.backHandler = () => {
      if (this.props.viola) {
        this.props.backToViola();
        return true;
      } else {
        return false;
      }
    };
    if (BackHandler != null) BackHandler.addEventListener('hardwareBackPress', this.backHandler);
  }
  componentWillUnmount() {
    if (BackHandler != null) BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
  }

  render() {
    switch (this.state.dataset) {
      case 'conifers':
        return <NomenNative
          viola={this.props.viola}
          onViolaCollect={this.props.onViolaCollect}
          dataset={conifers_specs}
          goBack={() => this.setState({dataset: null})}
        />;
      case 'prairie':
        return <NomenNative
          viola={this.props.viola}
          onViolaCollect={this.props.onViolaCollect}
          dataset={mcgee_specs}
          goBack={() => this.setState({dataset: null})}
        />;
      case 'broadleaf':
        return <NomenNative
          viola={this.props.viola}
          onViolaCollect={this.props.onViolaCollect}
          dataset={broadleaf_specs}
          goBack={() => this.setState({dataset: null})}
        />;
      case null:
        return (
          <View style={styles.outerView}>
            {
              this.props.viola ? (
                <TouchableOpacity onPress={this.props.backToViola}>
                  <Image style={styles.backButton} source={require('../img/back.png')} />
                </TouchableOpacity>
              ) : undefined
            }
            <Text style={{alignSelf: 'center', fontWeight: 'bold', fontSize: 16, letterSpacing: 1, margin: 15}}>
              PLANT TYPE
            </Text>
            <ScrollView style={{flex: 1}} contentContainerStyle={{alignItems: 'stretch'}}>
              <TouchableOpacity style={[styles.homeSelect, styles.homeSelectDivide]} onPress={() => this.setState({dataset: 'conifers'})}>
                <Image style={styles.homeSelectImage} source={require('../plants/types/coniferous-tree.jpg')} />
                <Text style={[styles.homeSelectTextBox, styles.homeSelectText]}>Conifer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.homeSelect, styles.homeSelectDivide]} onPress={() => this.setState({dataset: 'prairie'})}>
                <Image style={styles.homeSelectImage} source={require('../plants/types/herb.jpg')} />
                <Text style={[styles.homeSelectTextBox, styles.homeSelectText]}>Herb / Forb</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.homeSelect, styles.homeSelectDivide]} onPress={() => this.setState({dataset: 'broadleaf'})}>
                <Image style={styles.homeSelectImage} source={require('../plants/types/tree-broadleaf.jpg')} />
                <Text style={[styles.homeSelectTextBox, styles.homeSelectText]}>Broadleaf Tree</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.homeSelect, styles.homeSelectDivide]}>
                <Image style={[styles.homeSelectImage, styles.homeSelectOff]} source={require('../plants/types/shrub.jpg')} />
                <View style={styles.homeSelectTextBox}>
                  <Text style={[styles.homeSelectText, styles.homeSelectOff]}>Broadleaf Shrub</Text>
                  <Text style={[styles.homeSelectSoonText, styles.homeSelectOff]}>Coming Soon</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.homeSelect]}>
                <Image style={[styles.homeSelectImage, styles.homeSelectOff]} source={require('../plants/types/woody-vine.jpg')} />
                <View style={styles.homeSelectTextBox}>
                  <Text style={[styles.homeSelectText, styles.homeSelectOff]}>Woody Vine</Text>
                  <Text style={[styles.homeSelectSoonText, styles.homeSelectOff]}>Coming Soon</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        );
    }
  }
}

const styles = StyleSheet.create({
  outerView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: 'white',
    marginTop: (Platform.OS === 'ios') ? 20 : 0,
  },
  scrollAttrs: {
    flex: 1,
  },
  scrollAttrsContent: {
    backgroundColor: 'white',
  },
  attrSection: {
    borderBottomColor: '#F4F4F4',
    borderBottomWidth: 2,
  },
  attrHeader: {
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
    fontSize: 16,
  },
  attrHeaderGray: {
    margin: 10,
    textAlign: 'center',
    color: 'gray',
    fontSize: 16,
  },
  attrValues: {
    marginLeft: 12,
    marginRight: 12,
  },
  attrOn: {
    margin: 10,
    textAlign: 'center',
    color: 'black',
    fontSize: 16,
  },
  attrButtonSelected: {
    backgroundColor: 'rgb(243,243,239)',
  },
  attrButtonUnselected: {
    backgroundColor: 'white',
  },
  attrAvailable: {
    margin: 10,
    textAlign: 'center',
    color: 'black',
    fontSize: 16,
  },
  attrOff: {
    margin: 10,
    textAlign: 'center',
    color: '#bbb',
    fontSize: 16,
  },
  marginTodo: {
    margin: 10,
    fontSize: 16,
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
    paddingTop: 5,
    borderRadius: 5,
    marginBottom: 5,
  },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomColor: '#F4F4F4',
    borderBottomWidth: 2,
  },
  topBarMulti: {
    alignItems: 'stretch',
    flexDirection: 'column',
    borderBottomColor: '#F4F4F4',
    borderBottomWidth: 2,
  },
  topBarMultiRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  resultsDrawer: {
    alignItems: 'stretch',
    flexDirection: 'column',
    paddingLeft: 80,
    paddingRight: 80,
  },
  resultsDrawerHeader: {
    borderBottomColor: '#F4F4F4',
    borderBottomWidth: 2,
  },
  resultsDrawerHeaderText: {
    letterSpacing: 1,
  },
  resultsDrawerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  resultsOptionOn: {
    borderBottomColor: 'black',
    borderBottomWidth: 2,
  },
  resultsOptionOff: {
  },
  resultsOptionText: {
    letterSpacing: 1,
    marginTop: 9,
    paddingBottom: 5,
  },
  resultsOptionIcon: {
    height: 30,
    width: 30,
    marginTop: 9,
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
    width: 60 * 0.4,
    height: 44 * 0.4,
  },
  searchButton: {
    margin: 10,
    width: 27 * 0.7,
    height: 24 * 0.7,
  },
  downButton: {
    margin: 10,
    width: 48 * 0.4,
    height: 24 * 0.4,
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
    margin: 5,
  },
  gridSquare: {
    flex: 1,
    flexDirection: 'column',
    margin: 5,
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
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeSelectOff: {
    opacity: 0.5,
  },
  homeSelectDivide: {
    borderBottomColor: '#aaa',
    borderBottomWidth: 1,
  },
  homeSelectImage: {
    height: 60,
    width: 60,
  },
  homeSelectTextBox: {
    flex: 1,
    marginLeft: 20,
  },
  homeSelectText: {
    fontSize: 25,
    letterSpacing: 2,
  },
  homeSelectSoonText: {
    fontSize: 13,
    letterSpacing: 1,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupHeaderDecoration: {
    height: 2,
    flex: 1,
    backgroundColor: '#ddd',
  },
  groupHeaderText: {
    textAlign: 'center',
    margin: 8,
    letterSpacing: 1,
  },
});
