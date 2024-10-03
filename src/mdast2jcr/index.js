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
import sanitizeHtml from './mdast-sanitize-html.js';
import downloadImages from './mdast-download-images.js';
import { buildAnchors } from './mdast-docx-anchors.js';
import { inspect } from 'util';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { splitSection } from './utils.js';


export default async function mdast2jcr(mdast, opts = {}) {
  const {
    log = console,
    resourceLoader,
    image2png,
  } = opts;

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

  process.stdout.write('==================================================\n');
  process.stdout.write(inspect(mdast));
  process.stdout.write('\n');
  process.stdout.write('==================================================\n');

  process.stdout.write(JSON.stringify(mdast, null, 2));
  process.stdout.write('\n');
  process.stdout.write('==================================================\n');

  // await downloadImages(ctx, mdast);
  await buildAnchors(mdast);
  // const children = await all(ctx, mdast);

  Handlebars.registerPartial('heading', '<title sling:resourceType="core/franklin/components/title/v1/title" jcr:primaryType="nt:unstructured" jcr:title="{{children.0.value}}" type="h{{depth}}"/>');
  Handlebars.registerPartial('paragraph', '<text sling:resourceType="core/franklin/components/text/v1/text" jcr:primaryType="nt:unstructured" text="{{#each children}}{{#encode}}{{> (whichPartial this.type) }}{{/encode}}{{/each}}"/>');
  Handlebars.registerPartial('text', '{{value}}');
  Handlebars.registerPartial('link', '<a href="{{url}}">{{children.0.text}}</a>');
  Handlebars.registerHelper('whichPartial', (context) => context);
  Handlebars.registerHelper('encode', function(options) {
    return Handlebars.Utils.escapeExpression(options.fn(this));
  });
  // register page template
  const pageTemplateXML = await readFile(path.resolve('./src/mdast2jcr', 'templates', 'page.xml'), 'utf-8');
  const template = Handlebars.compile(pageTemplateXML);

  const xml = template(mdast);

  process.stdout.write(xml);
  process.stdout.write('\n');
  process.stdout.write('==================================================\n');
  return xml;
}
