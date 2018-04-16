'use strict';

const SapService = require('./sap-service');
const SapCMQueueService = require('./sap-cm-queue-service');
const OrderTable = require('./order-table-service');

exports.handler = function(event, context, callback) {

    const creditmemo = JSON.parse(event.Body);

    console.log(JSON.stringify(creditmemo));

    OrderTable.fetchOrderInfo(creditmemo)
        .then(SapService.sendCreditMemo)
        .then(SapCMQueueService.deleteMessage)
        .then(result => callback(null, result))
        .catch(callback);
};
