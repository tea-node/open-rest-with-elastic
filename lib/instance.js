const Utils = require('./utils');

const defaultsOptions = { raw: true };

/* eslint func-names: 0 */
/* eslint no-underscore-dangle: 0 */
function initValues(values, options) {
  let defaults;

  /* eslint no-mixed-operators: 0 */
  values = values && Utils._.clone(values) || {};

  if (options.isNewRecord) {
    defaults = {};

    if (this.Model._hasDefaultValues) {
      defaults = Utils._.mapValues(this.Model._defaultValues, (valueFn) => {
        const value = valueFn();
        return value || Utils._.cloneDeep(value);
      });
    }

    // set id to null if not passed as value, a newly created dao has no id
    // removing this breaks bulkCreate
    // do after default values since it might have UUID as a default value
    if (!Object.prototype.hasOwnProperty.call(defaults, this.Model.primaryKeyAttribute)) {
      defaults[this.Model.primaryKeyAttribute] = null;
    }

    if (this.Model._timestampAttributes.createdAt && defaults[this.Model._timestampAttributes.createdAt]) {
      this.dataValues[this.Model._timestampAttributes.createdAt] = Utils.toDefaultValue(defaults[this.Model._timestampAttributes.createdAt]);
      delete defaults[this.Model._timestampAttributes.createdAt];
    }

    if (this.Model._timestampAttributes.updatedAt && defaults[this.Model._timestampAttributes.updatedAt]) {
      this.dataValues[this.Model._timestampAttributes.updatedAt] = Utils.toDefaultValue(defaults[this.Model._timestampAttributes.updatedAt]);
      delete defaults[this.Model._timestampAttributes.updatedAt];
    }

    if (this.Model._timestampAttributes.deletedAt && defaults[this.Model._timestampAttributes.deletedAt]) {
      this.dataValues[this.Model._timestampAttributes.deletedAt] = Utils.toDefaultValue(defaults[this.Model._timestampAttributes.deletedAt]);
      delete defaults[this.Model._timestampAttributes.deletedAt];
    }

    const defaultKeys = Object.keys(defaults);

    Utils._.each(defaultKeys, (key) => {
      if (values[key] === undefined) {
        this.set(key, Utils.toDefaultValue(defaults[key]), defaultsOptions);
        delete values[key];
      }
    });
  }

  this.set(values, options);
}


function Instance(values, options) {
  this.dataValues = {};
  this._previousDataValues = {};
  this._changed = {};
  this.$modelOptions = this.Model.options;
  this.$options = options || {};
  this.hasPrimaryKeys = this.Model.options.hasPrimaryKeys;

  /**
     * Returns true if this instance has not yet been persisted to the database
     * @property isNewRecord
     * @return {Boolean}
     */
  this.isNewRecord = options.isNewRecord;

  /**
     * Returns the Model the instance was created from.
     * @see {Model}
     * @property Model
     * @return {Model}
     */

  initValues.call(this, values, options);
}

Instance.prototype.toString = function () {
  return `[object ElasticModelInstance:${this.Model.name}]`;
};

/**
 * Get the value of the underlying data value
 *
 * @param {String} key
 * @return {any}
 */
Instance.prototype.getDataValue = function (key) {
  return this.dataValues[key];
};

/**
 * Update the underlying data value
 *
 * @param {String} key
 * @param {any} value
 */
Instance.prototype.setDataValue = function (key, value) {
  const originalValue = this._previousDataValues[key];

  if (!Utils.isPrimitive(value) || value !== originalValue) {
    this.changed(key, true);
  }

  this.dataValues[key] = value;
};

/**
 * If no key is given, returns all values of the instance, also invoking virtual getters.
 *
 * If key is given and a field or virtual getter is present for the key it will call that getter - else it will return the value for key.
 *
 * @param {String} [key]
 * @param {Object} [options]
 * @param {Boolean} [options.plain=false] If set to true, included instances will be returned as plain objects
 * @return {Object|any}
 */
Instance.prototype.get = function (key, options) { // testhint options:none
  if (options === undefined && typeof key === 'object') {
    options = key;
    key = undefined;
  }

  if (key) {
    if (this._customGetters[key]) {
      return this._customGetters[key].call(this, key);
    }
    return this.dataValues[key];
  }

  if (this._hasCustomGetters || (options && options.plain && this.$options.include) || (options && options.clone)) {
    const values = {};

    if (this._hasCustomGetters) {
      const _customGetterKeys = Object.keys(this._customGetters);

      /* eslint no-shadow: 0 */
      Utils._.each(_customGetterKeys, (_key) => {
        if (Object.prototype.hasOwnProperty.call(this._customGetters, _key)) {
          values[_key] = this.get(_key, options);
        }
      });
    }

    const dataValueKeys = Object.keys(this.dataValues);

    Utils._.each(dataValueKeys, (_key) => {
      if (!Object.prototype.hasOwnProperty.call(values, _key) && Object.prototype.hasOwnProperty.call(this.dataValues, _key)) {
        values[_key] = this.get(_key, options);
      }
    });

    return values;
  }

  return this.dataValues;
};

/**
 * Set is used to update values on the instance (the sequelize representation of the instance that is, remember that nothing will be persisted before you actually call `save`).
 * In its most basic form `set` will update a value stored in the underlying `dataValues` object. However, if a custom setter function is defined for the key, that function
 * will be called instead. To bypass the setter, you can pass `raw: true` in the options object.
 *
 * If set is called with an object, it will loop over the object, and call set recursively for each key, value pair. If you set raw to true, the underlying dataValues will either be
 * set directly to the object passed, or used to extend dataValues, if dataValues already contain values.
 *
 * When set is called, the previous value of the field is stored and sets a changed flag(see `changed`).
 *
 * Set can also be used to build instances for associations, if you have values for those.
 * When using set with associations you need to make sure the property key matches the alias of the association
 * while also making sure that the proper include options have been set (from .build() or .find())
 *
 * If called with a dot.separated key on a JSON/JSONB attribute it will set the value nested and flag the entire object as changed.
 *
 * @see {Model#find} for more information about includes
 * @param {String|Object} key
 * @param {any} value
 * @param {Object} [options]
 * @param {Boolean} [options.raw=false] If set to true, field and virtual setters will be ignored
 * @param {Boolean} [options.reset=false] Clear all previously set data values
 * @alias setAttributes
 */
Instance.prototype.set = function (key, value, options) { // testhint options:none
  let values;
  let originalValue;
  let keys;
  let i;
  let length;

  if (typeof key === 'object' && key !== null) {
    values = key;
    options = value || {};

    if (options.reset) {
      this.dataValues = {};
    }

    // If raw, and we're not dealing with includes or special attributes, just set it straight on the dataValues object
    if (options.raw && !(options && options.attributes) && !this.Model._hasBooleanAttributes && !this.Model._hasDateAttributes) {
      if (Object.keys(this.dataValues).length) {
        this.dataValues = Utils._.extend(this.dataValues, values);
      } else {
        this.dataValues = values;
      }
      // If raw, .changed() shouldn't be true
      this._previousDataValues = Utils._.clone(this.dataValues);
    } else {
      // Loop and call set

      if (options.attributes) {
        keys = options.attributes;

        for (i = 0, length = keys.length; i < length; i += 1) {
          if (values[keys[i]] !== undefined) {
            this.set(keys[i], values[keys[i]], options);
          }
        }
      } else {
        const valueKeys = Object.keys(values);
        Utils._.each(valueKeys, (key) => {
          this.set(key, values[key], options);
        });
      }

      if (options.raw) {
        // If raw, .changed() shouldn't be true
        this._previousDataValues = Utils._.clone(this.dataValues);
      }
    }
  } else {
    if (!options) { options = {}; }
    if (!options.raw) {
      originalValue = this.dataValues[key];
    }

    // If not raw, and there's a customer setter
    if (!options.raw && this._customSetters[key]) {
      this._customSetters[key].call(this, value, key);
    } else {
      // Bunch of stuff we won't do when its raw
      if (!options.raw) {
        // If attempting to set primary key and primary key is already defined, return
        if (this.Model._hasPrimaryKeys && originalValue && this.Model._isPrimaryKey(key)) {
          return this;
        }

        // If attempting to set read only attributes, return
        if (!this.isNewRecord && this.Model._hasReadOnlyAttributes && this.Model._isReadOnlyAttribute(key)) {
          return this;
        }

        // Convert date fields to real date objects
        if (this.Model._hasDateAttributes && this.Model._isDateAttribute(key) && !!value) {
          if (!(value instanceof Date)) {
            value = new Date(value);
          }
          if (!(originalValue instanceof Date)) {
            originalValue = new Date(originalValue);
          }
          if (originalValue && value.getTime() === originalValue.getTime()) {
            return this;
          }
        }
      }

      // Convert boolean-ish values to booleans
      if (this.Model._hasBooleanAttributes && this.Model._isBooleanAttribute(key) && value !== null && value !== undefined) {
        if (Buffer.isBuffer(value) && value.length === 1) {
          // Bit fields are returned as buffers
          value = value[0];
        }

        /* eslint no-nested-ternary: 0 */
        if (Utils._.isString(value)) {
          // Only take action on valid boolean strings.
          value = (value === 'true') ? true : (value === 'false') ? false : value;
        } else if (Utils._.isNumber(value)) {
          // Only take action on valid boolean integers.
          value = (value === 1) ? true : (value === 0) ? false : value;
        }
      }

      if (!options.raw && ((!Utils.isPrimitive(value) && value !== null) || value !== originalValue)) {
        this._previousDataValues[key] = originalValue;
        this.changed(key, true);
      }
      this.dataValues[key] = value;
    }
  }

  return this;
};

/**
 * If changed is called with a string it will return a boolean indicating whether the value of that key in `dataValues` is different from the value in `_previousDataValues`.
 *
 * If changed is called without an argument, it will return an array of keys that have changed.
 *
 * If changed is called without an argument and no keys have changed, it will return `false`.
 *
 * @param {String} [key]
 * @return {Boolean|Array}
 */
Instance.prototype.changed = function (key, value) {
  if (key) {
    if (value !== undefined) {
      this._changed[key] = value;
      return this;
    }
    return this._changed[key] || false;
  }

  const changed = Object.keys(this.dataValues).filter(key => this.changed(key));

  return changed.length ? changed : false;
};

/**
 * Returns the previous value for key from `_previousDataValues`.
 *
 * If called without a key, returns the previous values for all values which have changed
 *
 * @param {String} [key]
 * @return {any|Array<any>}
 */
Instance.prototype.previous = function (key) {
  if (key) {
    return this._previousDataValues[key];
  }

  return Utils._.pickBy(this._previousDataValues, (value, key) => this.changed(key));
};

Instance.prototype.save = function (options) {};


Instance.prototype.reload = function (options) {};

Instance.prototype.update = function (values, options) {};

Instance.prototype.updateAttributes = Instance.prototype.update;

Instance.prototype.destroy = function (options) {
};

Instance.prototype.restore = function (options) {
};

Instance.prototype.increment = function (fields, options) {
};

Instance.prototype.decrement = function (fields, options) {
};

Instance.prototype.equals = function (other) {
};

Instance.prototype.equalsOneOf = function (others) {
};

Instance.prototype.toJSON = function () {
};

module.exports = Instance;
