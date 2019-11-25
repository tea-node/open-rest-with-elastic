const each = require('lodash/each');
const isFunction = require('lodash/isFunction');
const includes = require('lodash/includes');
const get = require('lodash/get');
const size = require('lodash/size');
const ElasticSearch = require('@elastic/elasticsearch');
const Model = require('./model');

const { Client } = ElasticSearch;

/* eslint func-names: 0 */
module.exports = (opt, path, rest) => {
  const { utils } = rest;

  /** 存放models的定义，方便随时取出 */
  let Models = {};

  /**
   * 定义新方法
   */
  const defineClient = (client) => {
    // 添加define方法
    client.define = function (modelName, attributes, options) {
      const opts = options || {};
      opts.client = client;
      opts.modelName = modelName;
      const model = new Model(modelName, attributes, opts).init();
      return model;
    };
  };

  /**
   * 配置 model
   */
  const defineModel = (client) => {
    const models = utils.getModules(`${path}/elastics`, ['coffee', 'js'], ['index', 'base', 'mappings']);

    each(models, (v, k) => {
      Models[k] = Models[k] || v(client);
    });
  };

  /**
   * 配置 model mapping
   */
  const defineMapping = () => {
    const mappings = utils.require(`${path}/elastics/mappings`) || {};

    const properties = get(mappings, 'mappings.properties', {});

    if (size(properties)) {
      each(Models, (v, k) => {
        if (Models[k].setMappings && isFunction(Models[k].setMappings)) {
          Models[k].setMappings(mappings);
        }
      });
    }
  };

  /**
   * 配置 client extend
   */
  const defineExtend = (client) => {
    const extendedClient = utils.getModules(`${path}/elastics/extends`, ['coffee', 'js']);

    each(extendedClient, (v) => {
      if (v && isFunction(v)) {
        v(client);
      }
    });
  };

  /**
   * 配置 tableSync
   */
  const tableSync = () => {
    if (process.env.NODE_ENV !== 'development') return;
    if (!includes(process.argv, 'type-sync')) return;

    each(Models, (_Model) => {
      if (_Model.sync
        && isFunction(_Model.sync)
        && _Model.sync.then
        && isFunction(_Model.sync.then)
        && _Model.sync.catch
        && isFunction(_Model.sync.catch)) {
        _Model
          .sync()
          .then(utils.logger.info.bind(utils.logger, 'Synced'))
          .catch(utils.logger.error);
      }
    });
  };

  const init = () => {
    const client = new Client(opt);
    /** 1. 定义新方法 */
    defineClient(client);

    /** 2. 定义Model */
    defineModel(client);

    /** 3. 配置mapping */
    defineMapping();

    /** 4. 配置extend */
    defineExtend(client);

    /** 5. 同步表结构 */
    tableSync();
  };

  if (path && opt) init();

  /**
   * 获取 model
   */
  const getter = (name) => {
    if (!name) return Models;
    return Models[name];
  };

  /**
   * 重置 Models
   */
  const reset = () => {
    Models = {};
  };

  if (!utils.isProd) getter.reset = reset;

  return getter;
};
