'use strict';

const SapService = require('./sap-service');
const SapOrderQueueService = require('./sap-order-queue-service');
const OrderTable = require('./order-table-service');

exports.handler = function(event, context, callback) {

    SapService.sendCreditMemo(JSON.parse(event.Body))
    // .catch(OrderTable.saveError)
    //     .then(OrderTable.saveResult)
    //     .then(() => Promise.resolve(event))
    //     .then(SapOrderQueueService.deleteMessage)
        .then(result => callback(null, result))
        .catch(callback);
};
