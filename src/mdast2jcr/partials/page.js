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
import { findModelById, getField } from '../utils/Models.js';
import { findAll } from '../utils/mdast.js';
import { stripNewlines } from '../utils.js';
import link from './supports/link.js';
import image from './supports/image.js';

function buildPageMetadata(table, models) {
  const model = findModelById(models, 'page-metadata');

  const metadata = {};
  const [, ...rows] = findAll(table, (node) => node.type === 'gtRow', false);
  rows.forEach((row) => {
    const cells = findAll(row, (node) => node.type === 'gtCell', true);
    const key = toString(cells[0]);

    // if the model has the field, then add it to the metadata
    const field = getField(model, key);
    if (field) {
      // if the field is an image then we need to dig into the row to find the image
      if (field.component === 'reference') {
        const { url } = image.getProperties(row);
        metadata['xwalk:imageReference'] = url;
      } else if (link.supports(row)) {
        const { href } = link.getProperties(row);
        metadata[field.name] = href;
      } else {
        metadata[field.name] = stripNewlines(cells[1]);
      }
    }
  });
  return metadata;
}

function page(options) {
  const {
    models,
    ...mdast
  } = options.data.root;

  const attributes = {
    'cq:template': '/libs/core/franklin/templates/page',
  };

  const tables = findAll(mdast, (node) => node.type === 'gridTable', false);
  if (tables) {
    tables.forEach((table) => {
      const cell = find(table, { type: 'gtCell' });
      if (cell) {
        const isMetadata = toString(cell).toLowerCase() === 'metadata';
        if (isMetadata) {
          const meta = buildPageMetadata(table, models, attributes);
          Object.assign(attributes, meta);
        }
      }
    });
  }

  // pull the image reference out of the attributes
  const { 'xwalk:imageReference': imageRef, ...properties } = attributes;
  const attributesStr = Object.entries(properties).map(([k, v]) => `${k}="${v}"`).join(' ');

  return `<jcr:content ${attributesStr}>
    ${options.fn(this)}
    ${imageRef ? `<image jcr:primaryType="nt:unstructured" fileReference="${imageRef}" />` : ''}
    </jcr:content>
  `;
}

export default page;
