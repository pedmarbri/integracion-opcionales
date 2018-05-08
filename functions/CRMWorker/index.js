'use strict';

const CRMService = require('./crm-service');
const OrderTableService = require('./order-table-service');
const CRMQueueService = require('./crm-queue-service');

exports.handler = function (event, context, callback) {
    let order;

    const processCRMContactResult = result => {
        if (!result.contact) {
            return CRMService.insertContact()
                .then(OrderTableService.saveResult);
        }

        return OrderTableService.saveResult(result);
    };

    try {
        order = JSON.parse(event.Body);
    } catch (formatError) {
        callback(formatError);
        return;
    }

    console.log(event.Body);

    CRMService.fetchContact(order)
        .then(processCRMContactResult)
        .then(CRMQueueService.deleteMessage)
        .then(result => callback(null, result))
        .catch(callback);
};