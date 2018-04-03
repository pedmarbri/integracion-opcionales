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
            last_timestamp: now
        },
        crm: {
            last_result: 'pending',
            last_timestamp: now
        },
        bau: {
            last_result: 'pending',
            last_timestamp: now
        }
    };

    console.log(JSON.stringify(params));

    return table.put(params).promise().then(() => Promise.resolve(message));
};