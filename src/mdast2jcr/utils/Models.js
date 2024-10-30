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
 * @typedef {import('../mdast2jcr/index.d.ts').ModelDef} Model
 * @typedef {import('../mdast2jcr/index.d.ts').CollapsedFields} CollapsedFields
 * @typedef {import('../mdast2jcr/index.d.ts').FieldDef} Field
 */

/**
 * Get the model id from the array of models.
 * @param {Array<Model>} models The array of models.
 * @param {string} modelId The model id.
 * @return {Model}
 */
function findModelById(models, modelId) {
  return models.find((model) => model.id === modelId);
}

/**
 * Given a list of fields, return all fields that are not part of a collapsed field.
 * @param {Array<Field>} fields The fields to get the main fields
 * @return {Array<Field>} The main fields.
 */
function getMainFields(fields) {
  // suffix must be sorted by length descending according to the logic below
  const suffixes = ['MimeType', 'Title', 'Type', 'Text', 'Alt'];
  const itemNames = fields.map((item) => item.name);

  return fields.filter((item) => {
    const itemNameWithoutSuffix = suffixes.reduce((name, suffix) => {
      if (name.endsWith(suffix)) {
        return name.slice(0, -suffix.length);
      }
      return name;
    }, item.name);

    return !(itemNames.includes(itemNameWithoutSuffix) && itemNameWithoutSuffix !== item.name);
  });
}

/**
 * Group fields by the first part of their name.  Fields with names that contain
 * an underscore will be grouped together.
 * @link https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/content-modeling#element-grouping Experience League
 * @param {Model} model The model to group the fields for.
 * @return {Array<FieldDef>}
 */
function groupModelFields(model) {
  const fields = [];
  model.fields.forEach((field) => {
    if (field.name.includes('_')) {
      const groupName = field.name.split('_')[0];
      let groupObj = fields.find((item) => item.name === groupName);
      if (!groupObj) {
        groupObj = {
          component: 'group',
          name: groupName,
          fields: [],
        };
        fields.push(groupObj);
      }
      groupObj.fields.push(field);
    } else {
      fields.push(field);
    }
  });
  return fields;
}

/**
 * Given a model, return the field with the given name.
 * @param {Model} model The model.
 * @param {string} fieldName The name of the field to get.
 * @return {Field} field The field or undefined if not found.
 */
function getField(model, fieldName) {
  return model.fields.find((field) => field.name === fieldName);
}

export {
  getField,
  findModelById,
  groupModelFields,
  getMainFields,
};
