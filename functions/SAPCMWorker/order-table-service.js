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