/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import path from 'path';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import xmlFormatter from 'xml-formatter';
import { splitSection, unwrapImages as unwrapElements, wrapParagraphs } from './utils.js';
import { buildAnchors } from './mdast-docx-anchors.js';
import sanitizeHtml from './mdast-sanitize-html.js';
import headingPartial from './partials/heading.js';
import stringPartial from './partials/strong.js';
import emphasisPartial from './partials/emphasis.js';
import linkPartial from './partials/link.js';
import paragraphWrapperPartial from './partials/paragraph.js';
import nameHelper, { nameReset } from './helpers/name-helper.js';
import sectionHelper from './helpers/section-helper.js';
import imagePartial from './partials/image.js';
import encodeHelper from './helpers/encode-helper.js';
import whichPartialHelper from './helpers/which-partial-helper.js';
import gridTablePartial from './partials/grid-table.js';
import blockQuotePartial from './partials/blockquote.js';
import tablePartial from './partials/table.js';

// eslint-disable-next-line no-unused-vars
export default async function mdast2jcr(mdast, opts = {}) {
  // const { log = console, resourceLoader, image2png } = opts;
  // const nameCounter = {};

  // const ctx = {
  //   style: {},
  //   paragraphStyle: '',
  //   images: {},
  //   listLevel: -1,
  //   lists: [],
  //   log,
  //   image2png,
  //   resourceLoader,
  // };

  // eslint-disable-next-line no-param-reassign
  mdast = sanitizeHtml(mdast);
  // eslint-disable-next-line no-param-reassign
  mdast = splitSection(mdast);
  // eslint-disable-next-line no-param-reassign
  mdast = unwrapElements(mdast);
  // eslint-disable-next-line no-param-reassign
  mdast = wrapParagraphs(mdast);

  // await downloadImages(ctx, mdast);
  await buildAnchors(mdast);

  Handlebars.registerPartial('heading', headingPartial);
  Handlebars.registerPartial('image', imagePartial);
  Handlebars.registerPartial('link', linkPartial);
  Handlebars.registerPartial('strong', stringPartial);
  Handlebars.registerPartial('emphasis', emphasisPartial);
  Handlebars.registerPartial('paragraphWrapper', paragraphWrapperPartial);
  Handlebars.registerPartial('gridTable', gridTablePartial); // TODO
  Handlebars.registerPartial('blockquote', blockQuotePartial); // TODO
  Handlebars.registerPartial('table', tablePartial); // TODO

  Handlebars.registerHelper('whichPartial', whichPartialHelper);
  Handlebars.registerHelper('encode', encodeHelper);
  Handlebars.registerHelper('nameHelper', nameHelper);
  Handlebars.registerHelper('section', sectionHelper);

  // reset the name helper counter
  nameReset();

  // register page template
  const pageTemplateXML = await readFile(
    path.resolve('./src/mdast2jcr', 'templates', 'page.xml'),
    'utf-8',
  );

  const template = Handlebars.compile(pageTemplateXML);

  let xml = template(mdast);
  xml = xmlFormatter(xml, {
    indentation: '  ', // 2 spaces
    filter: (node) => node.type !== 'Comment', // Remove comments
    collapseContent: true,
    lineSeparator: '\n',
  });

  process.stdout.write(xml);

  process.stdout.write('\n');
  process.stdout.write('==================================================\n');
  return xml;
}
