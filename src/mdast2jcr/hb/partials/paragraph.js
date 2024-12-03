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
import Handlebars from 'handlebars';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

function paragraph(context) {
  const hast = toHast(context);
  const html = toHtml(hast);
  const uniqueName = Handlebars.helpers.nameHelper.call(context, 'text');
  return `<text${uniqueName} 
        sling:resourceType="core/franklin/components/text/v1/text" 
        jcr:primaryType="nt:unstructured" 
        text="${Handlebars.Utils.escapeExpression(html)}"/>`;
}

export default paragraph;
