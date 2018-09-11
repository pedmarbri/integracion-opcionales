'use strict';

const BAUService = require('./bau-service');
const BAUQueueService = require('./bau-queue-service');
const OrderTableService = require('./order-table-service');

exports.handler = (event, context, callback) => {
  let order;

  try {
    order = JSON.parse(event.Body);
  } catch (formatError) {
    callback(formatError);
    return;
  }

  BAUService.saveOrder(order)
    .then(OrderTableService.saveResult)
    .then(() => Promise.resolve(event))
    .then(BAUQueueService.deleteMessage)
    .then(result => callback(null, result))
    .catch(callback);
};

