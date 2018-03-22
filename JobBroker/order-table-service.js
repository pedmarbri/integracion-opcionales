'use strict';

const AWS = require('aws-sdk');

const ORDER_TABLE = process.env.ORDER_TABLE;

const db = new AWS.DynamoDB();

exports.saveMessage = message => {
    const params = {
        Item: {
            order_id: {
                S: message.json.payload.order_id
            },
            payload: {
                S: JSON.stringify(message.json.payload)
            }
        },
        TableName: ORDER_TABLE,
        ConditionExpression: "attribute_not_exists(order_id)"
    };

    return db.putItem(params).promise().then(() => Promise.resolve(message));
};