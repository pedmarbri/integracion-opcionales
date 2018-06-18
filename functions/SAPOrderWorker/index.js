'use strict';

const SapService = require('./sap-service');
const SapOrderQueueService = require('./sap-order-queue-service');
const OrderTable = require('./order-table-service');

exports.handler = function(event, context, callback) {

    const order = JSON.parse(event.Body);

    SapService.sendOrder(order)
        .catch(error => {
            return {
                result: { error: error },
                order: order,
            };
        })
        .then(OrderTable.saveResult)
        .then(() => Promise.resolve(event))
        .then(SapOrderQueueService.deleteMessage)
        .then(result => callback(null, result))
        .catch(callback);
};
