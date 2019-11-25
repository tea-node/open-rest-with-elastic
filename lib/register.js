const each = require('lodash/each');
const isFunction = require('lodash/isFunction');
const includes = require('lodash/includes');
const get = require('lodash/get');
const size = require('lodash/size');
const ElasticSearch = require('@elastic/elasticsearch');
const Model = require('./model');
const DataTypes = require('./data-types');

const { Client } = ElasticSearch;

module.exports = (opt, path, rest) => {
  const { utils } = rest;

  /** 存放models的定义，方便随时取出 */
  let Models = {};

  /**
   * 添加Client类方法
   */
  const defineClient = () => {
    /**
     * 定义model
     */
    Client.prototype.define = (modelName, attributes, options) => {
      const opts = options || {};
      opts.client = this;
      opts.modelName = modelName;
      let model = new Model(modelName, attributes, opts);
      model = model.init();
      return model;
    };

    // 暴露DataTypes
    Client.prototype.DATATYPES = DataTypes;
  };

  /**
   * 配置 model
   */
  const defineModel = (sequelize) => {
    const models = utils.getModules(`${path}/elastics`, ['coffee', 'js'], ['index', 'base', 'mappings']);

    each(models, (v, k) => {
      Models[k] = Models[k] || v(sequelize);
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

    each(Models, (Model) => {
      if (Model.sync
        && isFunction(Model.sync)
        && Model.sync.then
        && isFunction(Model.sync.then)
        && Model.sync.catch
        && isFunction(Model.sync.catch)) {
        Model
          .sync()
          .then(utils.logger.info.bind(utils.logger, 'Synced'))
          .catch(utils.logger.error);
      }
    });
  };

  const init = () => {
    const client = new Client(opt);

    /** 1. 添加client类方法 */
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
