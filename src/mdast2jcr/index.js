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


import sanitizeHtml from './mdast-sanitize-html.js';
import downloadImages from './mdast-download-images.js';
import { buildAnchors } from './mdast-docx-anchors.js';
import { inspect } from 'util';
import Handlebars from 'handlebars';


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
  //Handlebars.registerHelper('encode', (options) => Handlebars.Utils.escapeExpression(options.fn(this)));
  Handlebars.registerHelper("encode", function(options) {
    return Handlebars.Utils.escapeExpression(options.fn(this));
  });

  const template = Handlebars.compile(`<?xml version="1.0" encoding="UTF-8"?><jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="cq:Page">
    <jcr:content cq:template="/libs/core/franklin/templates/page" jcr:primaryType="cq:PageContent" sling:resourceType="core/franklin/components/page/v1/page" jcr:title="Sustainability | Sustainable Business Topics &amp; Trends | SAP" jcr:description="Learn how sustainability initiatives bring value across your business." image="/content/dam/sap/topics/media_12fad65cf53b722af46da922c38101b763d1113eb.png">
        <root jcr:primaryType="nt:unstructured" sling:resourceType="core/franklin/components/root/v1/root">
    {{#each children}}
    {{> (whichPartial this.type) }}
    {{/each}}
     </root>
    </jcr:content>
</jcr:root>`);
  const xml = template(mdast);

  process.stdout.write(xml);
  process.stdout.write('\n');
  process.stdout.write('==================================================\n');
  return xml;
}
