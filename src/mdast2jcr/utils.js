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

/**
 * @typedef {import('docx').XmlComponent} XmlComponent
 *
 * @param {XmlComponent} root
 * @param path
 * @returns {XmlComponent}
 */
// eslint-disable-next-line import/prefer-default-export
export function findXMLComponent(root, path) {
  const segs = path.split('/');
  let comp = root;
  while (comp && segs.length) {
    const key = segs.shift();
    comp = comp.root.find((c) => c.rootKey === key);
  }
  return comp;
}

/**
 * removes undefined and null properties from the given object.
 * @param {object} obj
 * @returns {object}
 */
export function removeUndefined(obj) {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined || obj[key] === null) {
      // eslint-disable-next-line no-param-reassign
      delete obj[key];
    }
  }
  return obj;
}
