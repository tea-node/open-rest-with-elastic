const ElasticSearch = require('@elastic/elasticsearch');
const register = require('./lib/register');
const Model = require('./lib/model');
const DataTypes = require('./lib/data-types');

ElasticSearch.Model = Model;
ElasticSearch.DataTypes = DataTypes;

const Init = (rest, path) => {
  const { elastic } = rest.utils.require(`${path}/configs`) || {};

  /** 释放 ElasticSearch 和 Client */
  rest.ElasticSearch = ElasticSearch;

  /** 添加define方法 */
  rest.ElasticSearch.Client.prototype.define = function (modelName, attributes, options) {
    const opts = options || {};
    opts.client = this;
    opts.modelName = modelName;
    const model = new Model(modelName, attributes, opts).init();
    return model;
  };

  /**
    * model 的 初始化
    * 将获取Model类的方法注册到rest.utils上
    */
  rest.utils.elastic = register(elastic, path, rest);

  return rest.utils.elastic;
};

Init.ElasticSearch = ElasticSearch;

module.exports = Init;
