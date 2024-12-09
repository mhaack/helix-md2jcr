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

/**
 * The FieldResolver class attempts to resolve a node to a model's field.
 */
class FieldGroupFieldResolver {
  /**
   * Constructor.
   * @param {Component} component - the component associated with the model.
   */
  constructor(component) {
    this.component = component;
  }

  /**
   * Resolve the field.
   * @param {Node} node - the node
   * @param {{isGrouped: boolean, name: string, fields: [],
   * collapsed: [{isGrouped: boolean, name: string, fields: []}]}} fieldGroup - the field group
   */
  resolve(node, fieldGroup) {
    const fieldGroupCloned = structuredClone(fieldGroup);
    let currentField = fieldGroupCloned.fields.shift();
    let found = false;

    // if we have a heading node we can try to find the corresponding field in the template
    if (node.type === 'heading') {
      const headingType = `h${node.depth}`;
      const defaultTemplateFields = Object.entries(this.component.defaultFields);

      for (const [templateFieldName, templateFieldValue] of defaultTemplateFields) {
        if (templateFieldValue === headingType) {
          // go through the field groups' fields attempting to find a collapsed field that
          // matches the template field name
          while (fieldGroupCloned.fields.length > 0) {
            if (currentField.collapsed) {
              const f = currentField.collapsed
                .find((collapsedField) => collapsedField.name === templateFieldName);

              if (f) {
                found = true;
                break;
              }
            }
            currentField = fieldGroupCloned.fields.shift();
          }
          if (found) break;
        }
      }
    }

    if (!found) {
      return fieldGroup.fields.shift();
    } else {
      return currentField;
    }
  }
}

export default FieldGroupFieldResolver;
