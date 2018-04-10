'use strict';

const AWS = require('aws-sdk');

const ORDER_TABLE = process.env.ORDER_TABLE;

const table = new AWS.DynamoDB.DocumentClient();

const saveError = sapResult => {
    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: sapResult.order.order_id
        },
        UpdateExpression: 'set ' + [
            '#i.sap.last_result = :last_result',
            '#i.sap.last_timestamp = :now',
            '#i.sap.#e = list_append(#i.sap.#e, :errors)'
        ].join(', '),
        ExpressionAttributeNames: {
            '#i': 'integrations',
            '#e': 'error_history'
        },
        ExpressionAttributeValues: {
            ':last_result': 'error',
            ':now': new Date().toISOString(),
            ':errors': [
                {
                    integration_timestamp: new Date().toISOString(),
                    error_message: sapResult.result.T_RETURN.item[0].MESSAGE
                }
            ]
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(sapResult.order));
};

exports.saveResult = sapResult => {

    if (!sapResult.result.VBELN) {
        return saveError(sapResult);
    }

    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: sapResult.order.order_id
        },
        UpdateExpression: 'set integrations.sap.last_result = :lr, integrations.sap.last_timestamp = :now, sap_id = :si',
        ExpressionAttributeValues: {
            ':lr': 'ok',
            ':si': sapResult.result.VBELN,
            ':now': new Date().toISOString()
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(sapResult.order));
};

exports.saveError = saveError;