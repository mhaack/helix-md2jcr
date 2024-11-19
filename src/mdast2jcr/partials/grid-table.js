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
import { getComponentByTitle, getModelId } from '../utils/Definitions.js';
import { findModelById, getField, getMainFields, groupModelFields, } from '../utils/Models.js';
import { findAll } from '../utils/mdast.js';
import { getHandler } from '../handlers/index.js';
import link from '../handlers/link.js';
import image from '../handlers/image.js';
import { encodeHtml, encodeHTMLEntities } from '../utils.js';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

/**
 * @typedef {import('../index.js').FieldDef} Field
 * @typedef {import('../index.js').DefinitionDef} Definition
 * @typedef {import('../index.js').FiltersDef} Filters
 */

/**
 * Remove the field from the fields array.
 * @param field
 * @param fields
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

function collapseField(id, fields, node, parentNode, properties = {}) {
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
          const type = link.getType(parentNode);
          properties[field.name] = type;
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
 * @param {object} mdast - the mdast tree.
 * @param {Model} model - the model.
 * @param {string} mode - the mode either 'keyValue' or 'simple'.
 * @return {{}} - the properties
 */
function extractProperties(mdast, model, mode) {
  const properties = {};

  // the first cells is the header row, so we skip it
  const [, ...nodes] = findAll(mdast, (node) => node.type === 'gtCell', true);

  // if we are in keyValue mode, then we can throw away the key columns
  // this will leave us with just the value columns
  if (mode === 'keyValue') {
    // eslint-disable-next-line no-plusplus
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (i % 2 === 0) {
        nodes.splice(i, 1);
      }
    }
  }

  // go through the model's fields, and for fields that should be "grouped" together
  // combine them under a new type called "group", this is a way to identify fields that should
  // be grouped together
  const fields = groupModelFields(model);

  // get all fields that are not field collapsed
  const mainFields = getMainFields(fields);

  mainFields.forEach((field, idx) => {
    // if we have more nodes than fields, then we can't process them as they won't
    // line up to the fields in the models
    if (nodes.length <= idx) {
      return;
    }

    const currentNode = nodes[idx];

    // handle group fields that were generated by the groupModelFields function
    if (field.component === 'group') {
      const p = extractGroupProperties(mdast, field, nodes, properties);
      Object.assign(properties, p);
    } else if (field.component === 'richtext') {
      // obtain the html by taking the mdast and converting it to hast and then to html
      const hast = toHast(currentNode);
      properties[field.name] = encodeHtml(toHtml(hast));
    } else if (field.component === 'reference') {
      const imageNode = find(currentNode, { type: 'image' });
      properties[field.name] = imageNode.url;
      collapseField(field.name, fields, imageNode, properties);
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
        collapseField(field.name, fields, headlineNode, properties);
        removeField(field, fields);
      } else {
        let value = encodeHTMLEntities(toString(currentNode));
        if (field.component === 'multiselect' || field.component === 'aem-tag') {
          value = `[${value.split(',').map((v) => v.trim()).join(',')}]`;
        }
        if (value) {
          properties[field.name] = value;
        }
      }
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

    // remove the classes field from the model fields
    removeField(classesField, model.fields);
  }

  return props;
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

  const properties = {
    'sling:resourceType': 'core/franklin/components/link/v1/block',
    'jcr:primaryType': 'nt:unstructured',
  };

  const headerProps = extractBlockHeaderProperties(models, definition, mdast);
  // assign the header properties to the block properties
  Object.assign(properties, headerProps);

  const model = findModelById(models, headerProps.model);

  // at this point extract the properties from the markdown and use the model to map the properties
  const component = getComponentByTitle(definition, headerProps.name);
  const mode = component.keyValue ? 'keyValue' : 'simple';
  const props = extractProperties(mdast, model, mode);
  Object.assign(properties, props);

  // do we need to do something here with the filters?
  // filters...

  const attributesStr = Object.entries(properties).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<block${uniqueName} ${attributesStr}></block>`;
}

export default gridTablePartial;
