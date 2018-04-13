'use strict';

const AWS = require('aws-sdk');

const ORDER_TABLE = process.env.ORDER_TABLE;

const table = new AWS.DynamoDB.DocumentClient();

exports.saveMessage = message => {
    const params = {
        Item: message.json.payload,
        TableName: ORDER_TABLE,
        ConditionExpression: "attribute_not_exists(order_id)"
    };

    const now = new Date().toISOString();

    // Add an empty map to store integrations results
    params.Item.integrations = {
        sap: {
            last_result: 'pending',
            last_timestamp: now,
            error_history: []
        },
        crm: {
            last_result: 'pending',
            last_timestamp: now,
            error_history: []
        },
        bau: {
            last_result: 'pending',
            last_timestamp: now,
            error_history: []
        }
    };

    console.log(JSON.stringify(params));

    return table.put(params).promise().then(() => Promise.resolve(message));
};