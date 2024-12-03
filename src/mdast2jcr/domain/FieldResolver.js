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
class FieldResolver {
  /**
   * Constructor.
   * @param {Model} model - the model
   * @param {Component} component - the component associated with the model.
   */
  constructor(model, component) {
    this.model = model;
    this.component = component;
  }

  /**
   * Resolve the field.
   * @param {Node} node - the node
   * @param {{isGrouped: boolean, name: string, fields: [],
   * collapsed: [{isGrouped: boolean, name: string, fields: []}]}} fieldGroup - the field group
   */
  resolve(node, fieldGroup) {
    let currentField = fieldGroup.fields.shift();

    // if we have a heading node we can try to find the corresponding field in the template
    if (node.type === 'heading') {
      const headingType = `h${node.depth}`;
      const defaultTemplateFields = Object.entries(this.component.defaultFields);

      let found = false;
      for (const [templateFieldName, templateFieldValue] of defaultTemplateFields) {
        if (templateFieldValue === headingType) {
          while (fieldGroup.fields.length > 0) {
            if (currentField.collapsed) {
              const f = currentField.collapsed
                .find((collapsedField) => collapsedField.name === templateFieldName);

              if (f) {
                found = true;
                break;
              }
            }
            currentField = fieldGroup.fields.shift();
          }
          if (found) break;
        }
      }
    }

    return currentField;
  }
}

export default FieldResolver;
