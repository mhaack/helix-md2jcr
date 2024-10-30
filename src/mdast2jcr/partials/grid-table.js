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
import Handlebars from 'handlebars';
import { getModelId } from '../utils/Definitions.js';
import {
  findModelById, getField, groupModelFields, getMainFields,
} from '../utils/Models.js';
import { findAll } from '../utils/mdast.js';
import { getHandler } from '../handlers/index.js';
import link from '../handlers/link.js';
import image from '../handlers/image.js';

/**
 * @typedef {import('../index.js').FieldDef} Field
 * @typedef {import('../index.js').DefinitionDef} Definition
 */

/**
 * Locate the name of the Block and any classes that are associated with it.
 * Return null if the block name can not be found in the models.
 * @param mdast {object} - the mdast tree
 * @param {Definition} definition - the definitions object.
 * @returns {null|{name: string, classes: string[]}, modelId: string} - the name of the
 * block, any classes, and an associated model id.
 */
function getBlockDetails(mdast, definition) {
  const row = find(mdast, { type: 'gtRow' });
  if (row) {
    const cell = find(row, { type: 'gtCell' });
    if (cell) {
      const textNode = find(cell, { type: 'text' });
      // if the textNode.value looks like "block (foo, bar)", return an object that looks like
      // { name: "block", classes: ["foo", "bar"] }
      // const matches = textNode.value.match(/^([^(]+)\s*(\(([^)]+)\))?$/);
      const regex = /^(?<blockName>[^(]+)\s*(\((?<classes>[^)]+)\))?$/;
      const match = textNode.value.match(regex);

      if (match) {
        const block = {
          name: match.groups.blockName.trim(),
          classes: match.groups.classes ? match.groups.classes.split(',').map((c) => c.trim()) : [],
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
  }
  return null;
}

function collapseField(id, fields, node, properties = {}) {
  /* eslint-disable no-param-reassign */
  const suffixes = ['Alt', 'Type', 'MimeType', 'Text', 'Title'];
  suffixes.forEach((suffix) => {
    const field = fields.find((f) => f.name === `${id}${suffix}`);
    if (field) {
      if (suffix === 'Type') {
        if (node?.tagName.startsWith('h')) {
          properties[field.name] = node?.tagName?.toLowerCase();
        } else if (link.supports(node)) {
          properties[field.name] = link.getType(node);
        }
      } else if (link.supports(node)) {
        if (suffix === 'Text') {
          console.log('text');
          // properties[field.name] = encodeHTMLEntities(select('a', node)?.children?.[0]?.value);
        } else {
          console.log('else');
          // properties[field.name] = encodeHTMLEntities(select('a', node)?.properties?.[suffix.toLowerCase()]);
        }
      } else if (suffix === 'MimeType') {
        // TODO: can we guess the mime type from the src?
        properties[field.name] = 'image/unknown';
      } else {
        // properties[field.name] = encodeHTMLEntities(node?.properties?.[suffix.toLowerCase()]);
      }
      // remove falsy names
      if (!properties[field.name]) delete properties[field.name];
      fields.filter((value, index, array) => {
        if (value.name === `${id}${suffix}`) {
          array.splice(index, 1);
          return true;
        }
        return false;
      });
    }
  });
  return properties;
}

// the field is a group and will have children
function extractGroupProperties(mdast, groupField, nodes, properties) {
  const props = { ...properties };

  if (groupField.component !== 'group') {
    return props;
  }

  const groupMainFields = getMainFields(groupField.fields);
  let remainingFields = [...groupMainFields];

  function getSpecificFieldByCondition(value, element, condition) {
    const parsed = remainingFields.map((field, index) => ({ field, index }))
      .filter(({ field }) => condition(field, groupField.fields))
      .map(({ field, index }) => ({
        field,
        index,
        properties: {
          [field.name]: value,
          ...collapseField(field.name, [...groupField.fields], element),
        },
      }));

    const ranked = parsed.sort((a, b) => {
      const aProps = Object.keys(a.properties).length;
      const bProps = Object.keys(b.properties).length;
      if (aProps === bProps) {
        return a.index - b.index;
      }
      return bProps - aProps;
    });

    const [firstField] = ranked;
    return firstField;
  }

  nodes.forEach((node) => {
    const handler = getHandler(node);
    if (handler) {
      const handlerProps = handler.getProperties(node);

      if (handler.name === 'link') {
        const firstField = getSpecificFieldByCondition(handlerProps.href, node, link.condition);
        if (firstField) {
          properties[firstField.field.name] = Handlebars.Utils.escapeExpression(handlerProps.href);
          collapseField(firstField.field.name, groupField.fields, node, properties);
          remainingFields = remainingFields.slice(firstField.index + 1);
          return;
        }
      }

      if (handler.name === 'image') {
        const firstField = getSpecificFieldByCondition(handlerProps.src, node, image.condition);
        if (firstField) {
          properties[firstField.field.name] = Handlebars.Utils.escapeExpression(handlerProps.src);
          collapseField(firstField.field.name, groupField.fields, node, properties);
          remainingFields = remainingFields.slice(firstField.index + 1);
        }
      }
    }
  });

  return props;
}

/**
 * Given a row, a component, and a model, extract the properties from the row
 * @param table - The table
 * @param {Component} component - the component.
 * @param {Model} model - the model.
 * @return {{}}
 */
function extractProperties(mdast, model) {
  const properties = {};

  // the first row is the header row, so we skip it
  const [, ...nodes] = findAll(mdast, (node) => node.type === 'gtCell', true);

  // go through the model's fields, and for fields that should be "grouped" together
  // combine them under a new type called "group"
  const fields = groupModelFields(model);

  // get all fields that are not field collapsed
  const mainFields = getMainFields(fields);

  mainFields.forEach((field) => {
    // groupModelFields collected ang generates a group field if present, if we have this field
    // then we need to process it differently.
    if (field.component === 'group') {
      const p = extractGroupProperties(mdast, field, nodes, properties);
      Object.assign(properties, p);
    }
  });

  return properties;
}

/**
 * Extract the properties that are belong to the block header.  Properties like
 * name, model id, and classes.
 * @param {object} models - the models object
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
  }

  return props;
}

/**
 * The gridTablePartial function is a Handlebars partial that generates a block element.
 * @param { {models: Array<Model>, definition: Definition, mdast: object} } context - The context
 * object that contains the models, definition, and mdast.
 * @return {string} - The generated block element.
 */
function gridTablePartial(context) {
  const {
    models,
    definition,
    ...mdast
  } = context;

  const uniqueName = Handlebars.helpers.nameHelper.call(context, 'block');

  const properties = {
    'sling:resourceType': 'core/franklin/components/link/v1/block',
    'jcr:primaryType': 'nt:unstructured',
  };

  const headerProps = extractBlockHeaderProperties(models, definition, mdast);
  Object.assign(properties, headerProps);

  const model = findModelById(models, headerProps.model);

  const props = extractProperties(mdast, model);
  Object.assign(properties, props);

  const attributesStr = Object.entries(properties).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<block${uniqueName} ${attributesStr}></block>`;
}

export default gridTablePartial;
