const _ = require('lodash');
const inflection = require('inflection');
const DataTypes = require('./data-types');

const primitives = ['string', 'number', 'boolean'];

function isPrimitive(val) {
  return primitives.indexOf(typeof val) !== -1;
}

const normalizeDataType = (Type) => {
  const type = typeof Type === 'function' ? new Type() : Type;
  return type;
};

function normalizeAttribute(attribute) {
  if (!_.isPlainObject(attribute)) {
    attribute = { type: attribute };
  }

  if (!attribute.type) return attribute;

  attribute.type = normalizeDataType(attribute.type);

  if (Object.prototype.hasOwnProperty.call(attribute, 'defaultValue')) {
    if (typeof attribute.defaultValue === 'function' && (
      attribute.defaultValue === DataTypes.NOW
         || attribute.defaultValue === DataTypes.UUIDV1
         || attribute.defaultValue === DataTypes.UUIDV4
    )) {
      /* eslint new-cap: 0 */
      attribute.defaultValue = new attribute.defaultValue();
    }
  }

  return attribute;
}

function underscoredIf(string, condition) {
  let result = string;

  if (condition) {
    result = inflection.underscore(string);
  }

  return result;
}

function toDefaultValue(value) {
  if (typeof value === 'function') {
    const tmp = value();
    return tmp;
  } if (value instanceof DataTypes.NOW) {
    return new Date();
  } if (_.isPlainObject(value) || _.isArray(value)) {
    return _.clone(value);
  }
  return value;
}

module.exports = {
  _, isPrimitive, normalizeAttribute, underscoredIf, toDefaultValue,
};
