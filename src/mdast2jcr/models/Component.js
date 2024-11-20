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
 * The Component class represents a single component located in the
 * component-definitions.json file.
 */
class Component {
  /**
   * Create a new Component.
   * @param {string} name
   * @param {string} modelId
   * @param {string} filterId
   * @param {boolean} keyValue
   */
  constructor(name, modelId, filterId, keyValue = false) {
    this._filterId = filterId;
    this._modelId = modelId;
    this._keyValue = keyValue;
    this._name = name;
  }

  get filterId() {
    return this._filterId;
  }

  get modelId() {
    return this._modelId;
  }

  get keyValue() {
    return this._keyValue;
  }

  get name() {
    return this._name;
  }
}

export default Component;