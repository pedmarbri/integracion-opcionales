'use strict';

const AWS = require('aws-sdk');

const ORDER_TABLE = process.env.ORDER_TABLE;

const table = new AWS.DynamoDB.DocumentClient();

exports.saveResult = sapResult => {
    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: sapResult.order.order_id
        },
        UpdateExpression: 'set ' + [
            'integrations.sap.last_result = :lr',
            'integrations.sap.last_timestamp = :now',
            'sap_id = :si'
        ].join(', '),
        ExpressionAttributeValues: {
            ':lr': 'ok',
            ':si': sapResult.result.VBELN,
            ':now': new Date().toISOString()
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(sapResult.order));
};

exports.fetchOrderInfo = creditmemo => {

    const populateSapOrderInfo = result => {
        /**
         * @var {opcionales.Order}
         */
        const order = result.Item;

        console.log(JSON.stringify(result));

        if (!order) {
            return Promise.reject(new Error("Order not found."));
        }

        if (!order.sap_id) {
            return Promise.reject(new Error("Order is missing SAP ID."));
        }

        creditmemo.sap_order_id = order.sap_id;

        try {
            creditmemo.items = creditmemo.items.map(item => {
                if (!order.sap_rows || !order.sap_rows[item.sku]) {
                    throw new Error("SKU " + item.sku + " was not mapped to a Sap row.");
                }

                item.sap_row = order.sap_rows[item.sku];

                return item;
            });
        } catch (error) {
            return Promise.reject(error);
        }

        return Promise.resolve(creditmemo);
    };

    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: creditmemo.order_id
        }
    };

    return table.get(params).promise()
        .then(populateSapOrderInfo);
};
