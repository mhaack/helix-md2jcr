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

function sectionHelper(index, children, options) {
  const attributes = {
    'sling:resourceType': 'core/franklin/components/section/v1/section',
    'jcr:primaryType': 'nt:unstructured',
  };

  const uniqueName = Handlebars.helpers.nameHelper.call(this, 'section');

  const attributesStr = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<section${uniqueName} ${attributesStr}>${options.fn(this)}\n</section${uniqueName}>`;
}

export default sectionHelper;
