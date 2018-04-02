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

    return table.put(params).promise().then(() => Promise.resolve(message));
};