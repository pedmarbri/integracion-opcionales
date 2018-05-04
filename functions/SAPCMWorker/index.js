'use strict';

const SapService = require('./sap-service');
const SapCMQueueService = require('./sap-cm-queue-service');
const OrderTable = require('./order-table-service');

exports.handler = function(event, context, callback) {
    let creditMemo;

    try {
        creditMemo = JSON.parse(event.Body);
    } catch (formatError) {
        callback(formatError);
        return;
    }

    console.log(event.Body);

    OrderTable.fetchOrderInfo(creditMemo)
        .then(SapService.sendCreditMemo)
        .then(SapCMQueueService.deleteMessage)
        .then(result => callback(null, result))
        .catch(callback);
};
