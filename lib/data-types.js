const each = require('lodash/each');

/* eslint camelcase: 0 */
const string_types = ['keyword', 'text'];
const number_types = ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float'];
const date_types = ['date'];
const boolean_types = ['boolean'];
const binary_types = ['binary'];
const range_types = ['integer_range', 'float_range', 'long_range', 'double_range', 'date_range'];
const complex_types = ['object', 'nested'];
const geo_types = ['geo_point', 'geo_shape'];
const specialisted_types = ['ip', 'completion', 'token_count', 'murmur3'];
const virtual_types = ['virtual'];

const dataTypes = {};

/* string types */
each(string_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* number types */
each(number_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* date types */
each(date_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* date types */
each(boolean_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* binary types */
each(binary_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* range types */
each(range_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* complex types */
each(complex_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* geo types */
each(geo_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* specialisted types */
each(specialisted_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

/* virtual types */
each(virtual_types, (type) => {
  const upperType = type.toUpperCase();
  dataTypes[upperType] = type;
});

dataTypes.STRING_TYPES = string_types;
dataTypes.NUMBER_TYPES = number_types;
dataTypes.DATE_TYPES = date_types;
dataTypes.BOOLEAN_TYEPS = boolean_types;
dataTypes.BINARY_TYPES = binary_types;
dataTypes.RANGE_TYEPS = range_types;
dataTypes.COMPLEX_TYPES = complex_types;
dataTypes.GEO_TYPES = geo_types;
dataTypes.SPECIALISTED_TYPES = specialisted_types;
dataTypes.VIRTUAL_TYPES = virtual_types;

module.exports = dataTypes;
