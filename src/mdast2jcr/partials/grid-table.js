/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { find } from 'unist-util-find';
import { toString } from 'mdast-util-to-string';
import Handlebars from 'handlebars';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { getComponentByTitle, getModelId } from '../utils/Definitions.js';
import {
  findModelById, getField, getMainFields, groupModelFields,
} from '../utils/Models.js';
import { findAll } from '../utils/mdast.js';
import link from '../handlers/link.js';
import { encodeHtml, encodeHTMLEntities } from '../utils.js';

/**
 * @typedef {import('../index.js').FieldDef} Field
 * @typedef {import('../index.js').DefinitionDef} Definition
 * @typedef {import('../index.js').FiltersDef} Filters
 */

function removeField(field, fields) {
  for (let i = 0; i < fields.length; i += 1) {
    if (fields[i].name === field.name) {
      fields.splice(i, 1);
      i -= 1;
    }
  }
}

/**
 * Locate the name of the Block and any classes that are associated with it.
 * Return null if the block name can not be found in the models.
 * @param mdast {object} - the mdast tree
 * @param {Definition} definition - the definitions object.
 * @returns {null|{name: string, classes: string[]}, modelId: string} - the name of the
 * block, any classes, and an associated model id.
 */
function getBlockDetails(mdast, definition) {
  const header = find(mdast, { type: 'gtHeader' });
  if (header) {
    const textNode = find(header, { type: 'text' });
    // if the textNode.value looks like "block (foo, bar)", return an object that looks like
    // { name: "block", classes: ["foo", "bar"] }
    const regex = /^(?<blockName>[^(]+)\s*(\((?<classes>[^)]+)\))?$/;
    const match = toString(textNode).match(regex);

    if (match) {
      const block = {
        name: match.groups.blockName.trim(),
        classes: match.groups.classes ? match.groups.classes.split(',')
          .map((c) => c.trim()) : [],
      };

      // try to locate the model name by inspecting the definition file
      const modelId = getModelId(definition, block.name);

      if (modelId) {
        block.modelId = modelId;
      } else {
        if (block.name.toLowerCase() === 'metadata') {
          block.modelId = 'page-metadata';
        } else if (block.name.toLowerCase() === 'section metadata') {
          block.modelId = 'section-metadata';
        }
        console.warn(`No model found for block ${block.name}`);
      }
      return block;
    }
  }
  return null;
}

/**
 * Process the field and collapse the field into the properties object.
 * @param id {string} - the id of the field
 * @param fields {Array<Field>} - the fields array
 * @param node {Node} - the node to process
 * @param parentNode {Node} - the parent node if necessary to inspect the child's parent for details
 * @param properties {object} - the properties object
 * @return {*}
 */
function collapseField(id, fields, node, parentNode, properties) {
  /* eslint-disable no-param-reassign */
  const suffixes = ['Alt', 'Type', 'MimeType', 'Text', 'Title'];
  suffixes.forEach((suffix) => {
    const field = fields.find((f) => f.name === `${id}${suffix}`);
    if (field) {
      if (suffix === 'Type') {
        // a heading can have a type like h1, h2
        if (node.type === 'heading') {
          properties[field.name] = `h${node.depth}`;
        } else if (link.supports(node)) {
          // determine the type of the link by inspecting the parent node
          // links can be wrapped in strong or em tags, or have no wrapping
          properties[field.name] = link.getType(parentNode);
        }
      } else if (link.supports(node)) { // buttons / links
        if (suffix === 'Text') {
          properties[field.name] = encodeHTMLEntities(link.getProperties(node).text);
        } else {
          properties[field.name] = encodeHTMLEntities(node[suffix.toLowerCase()]);
        }
      } else if (suffix === 'MimeType') {
        // TODO: can we guess the mime type from the src?
        properties[field.name] = 'image/unknown';
      } else {
        // take the suffix and read the property from the node
        properties[field.name] = encodeHTMLEntities(node[suffix.toLowerCase()]);
      }

      // clean out any empty properties so that we don't pollute the output
      if (!properties[field.name]) {
        delete properties[field.name];
      }

      // remove the field from the fields array as we have processed it
      removeField(field, fields);
    }
  });
  return properties;
}

function extraPropertiesForNode(field, currentNode, properties, fields) {
  if (field.component === 'richtext') {
    // obtain the html by taking the mdast and converting it to hast and then to html
    const hast = toHast(currentNode);
    properties[field.name] = encodeHtml(toHtml(hast));
  } else if (field.component === 'reference') {
    const imageNode = find(currentNode, { type: 'image' });
    properties[field.name] = imageNode.url;
    collapseField(field.name, fields, imageNode, null, properties);
    removeField(field, fields);
  } else {
    const linkNode = find(currentNode, { type: 'link' });
    const headlineNode = find(currentNode, { type: 'heading' });
    if (linkNode) {
      properties[field.name] = linkNode.url;
      collapseField(field.name, fields, linkNode, currentNode, properties);
      removeField(field, fields);
    } else if (headlineNode) {
      properties[field.name] = encodeHTMLEntities(toString(headlineNode));
      collapseField(field.name, fields, headlineNode, null, properties);
      removeField(field, fields);
    } else {
      let value = encodeHTMLEntities(toString(currentNode));
      if (field.component === 'multiselect' || field.component === 'aem-tag') {
        value = `[${value.split(',')
          .map((v) => v.trim())
          .join(',')}]`;
      }
      if (value) {
        properties[field.name] = value;
      }
    }
  }
}

// the field is a group and will have children
function extractGroupProperties(mdast, groupField, nodes, properties) {
  const props = { ...properties };

  if (groupField.component !== 'group') {
    return props;
  }

  const { fields } = groupField;

  const groupMainFields = getMainFields(groupField.fields);

  groupMainFields.forEach((field, idx) => {
    // if we have more nodes than fields, then we can't process them as they won't
    // line up to the fields in the models
    if (nodes.length <= idx) {
      return;
    }

    const currentNode = nodes[idx];

    extraPropertiesForNode(field, currentNode, properties, fields);
  });

  return props;
}

/**
 * Given a row, a component, and a model, extract the properties from the row
 * @param {object} mdast - the mdast tree.
 * @param {Model} model - the model.
 * @param {string} mode - the mode either 'keyValue' or 'simple'.
 * @return {{}} - the properties
 */
function extractProperties(mdast, model, mode) {
  const properties = {};

  // the first cells is the header row, so we skip it
  const nodes = findAll(mdast, (node) => node.type === 'gtCell', true);
  if (mode !== 'blockItem') {
    // const toShift = findAll(mdast, (node) => node.type === 'gtCell' && node.colSpan > 1, false);
    // toShift.forEach(() => nodes.shift());
    nodes.shift();
  }

  // go through the model's fields, and for fields that should be "grouped" together
  // combine them under a new type called "group", this is a way to identify fields that should
  // be grouped together
  const fields = groupModelFields(model);

  // get all fields that are not field collapsed
  const mainFields = getMainFields(fields);

  // the field keys come into play when the component is a key value pair
  // the keys are used to order the fields in the order they appear in the markdown
  const fieldKeys = [];

  if (mode === 'keyValue') {
    // from the nodes (md table), grab the keys in the order they show up
    for (let i = 0; i < nodes.length; i += 2) {
      const keyNode = nodes[i];
      fieldKeys.push(toString(keyNode));
    }

    // now that we have the keys, throw away the key cells (nodes)
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (i % 2 === 0) {
        nodes.splice(i, 1);
      }
    }
  }

  // the mainFields contains all the fields that are not collapsed and in the order of the model
  // however the nodes are not in the same order as the fields, so we need to match them up
  // go through the main fields and order them based on the fieldKeys
  mainFields.sort((a, b) => {
    const aIdx = fieldKeys.indexOf(a.name);
    const bIdx = fieldKeys.indexOf(b.name);
    if (aIdx === -1 && bIdx === -1) {
      return 0;
    }
    if (aIdx === -1) {
      return 1;
    }
    if (bIdx === -1) {
      return -1;
    }
    return aIdx - bIdx;
  });

  mainFields.forEach((field, idx) => {
    // if we have more nodes than fields, then we can't process them as they won't
    // line up to the fields in the models
    if (nodes.length <= idx) {
      return;
    }

    const valueNode = nodes[idx];

    // handle group fields that were generated by the groupModelFields function
    if (field.component === 'group') {
      const groupNodes = nodes.slice(idx, idx + field.fields.length);
      const p = extractGroupProperties(mdast, field, groupNodes, properties);
      Object.assign(properties, p);
    } else {
      extraPropertiesForNode(field, valueNode, properties, fields);
    }
  });

  return properties;
}

/**
 * Extract the properties that are belong to the block header.  Properties like
 * name, model id, and classes.
 * @param {Array<Model>} models - the models object
 * @param {Definition} definition - the definitions object
 * @param {object} mdast - the mdast tree
 * @return {{
 *   name: string,
 *   model: string,
 *   classes?: string
 * }}
 */
function extractBlockHeaderProperties(models, definition, mdast) {
  const blockDetails = getBlockDetails(mdast, definition);
  const props = {};

  props.name = blockDetails.name;
  props.model = blockDetails.modelId;

  const model = findModelById(models, blockDetails.modelId);

  const classesField = getField(model, 'classes');

  if (blockDetails.classes.length > 0 && classesField) {
    props.classes = (classesField.component === 'multiselect')
      ? `[${blockDetails.classes.join(', ')}]` : blockDetails.classes.join(', ');

    // remove the classes field from the model fields
    removeField(classesField, model.fields);
  }

  return props;
}

function getBlockItems(mdast, models, model, definition, allowedComponents) {
  // if there are no allowed components then we can't do anything
  if (!allowedComponents.length) {
    return undefined;
  }

  // first row is always the header, followed by N number of property rows
  // we need to skip the rows that have a colSpan > 1
  const rows = findAll(mdast, (node) => node.type === 'gtRow', false);
  const toShift = findAll(mdast, (node) => node.type === 'gtCell' && node.colSpan > 1, false);
  toShift.forEach(() => rows.shift());

  // const fields = groupModelFields(model);
  // const fieldsWithoutClasses = fields.filter((field) => field.name !== 'classes');
  // if (fieldsWithoutClasses.length > 0 && rows.length > 0) {
  //   rows.shift();
  // }

  return rows.map((row, i) => allowedComponents.map((childComponentId) => {
    const childModel = findModelById(models, childComponentId);
    const properties = extractProperties(row, childModel, 'blockItem');
    return `<item_${i} sling:resourceType="core/franklin/components/block/v1/block/item" name="${childModel.id}" ${Object.entries(properties).map(([k, v]) => `${k}="${v}"`).join(' ')}></item_${i}>`;
  }));
}

/**
 * The gridTablePartial function is a Handlebars partial that generates a block element.
 * @param {{models: Array<Model>,
 * definition: Definition,
 * filters: Filters,
 * mdast: object}} context - The context
 * object that contains the models, definition, and mdast.
 * @return {string} - The generated block element.
 */
function gridTablePartial(context) {
  const {
    models,
    definition,
    filters,
    ...mdast
  } = context;

  const uniqueName = Handlebars.helpers.nameHelper.call(context, 'block');

  const attributes = {
    'sling:resourceType': 'core/franklin/components/link/v1/block',
    'jcr:primaryType': 'nt:unstructured',
  };

  // assign the header properties to the block properties
  const headerProps = extractBlockHeaderProperties(models, definition, mdast);
  Object.assign(attributes, headerProps);

  // now that we have the name of the block, we can find the associated model
  const model = findModelById(models, headerProps.model);

  const component = getComponentByTitle(definition, headerProps.name);

  const mode = component.keyValue ? 'keyValue' : 'simple';
  const props = extractProperties(mdast, model, mode);
  Object.assign(attributes, props);

  const ac = filters.find((f) => f.id === component.filterId)?.components || [];
  const blockItems = getBlockItems(mdast, models, model, definition, ac) || [];

  const attributesStr = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ');

  return `<block${uniqueName} ${attributesStr}>${blockItems.length > 0 ? blockItems.join('\n') : ''}</block>`;
}

export default gridTablePartial;
