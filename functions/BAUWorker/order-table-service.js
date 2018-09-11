'use strict';

const AWS = require('aws-sdk');

const ORDER_TABLE = process.env.ORDER_TABLE;
let table;
let dynamoDBOptions = {};

if (process.env.DYNAMODB_ENDPOINT) {
    dynamoDBOptions.endpoint = process.env.DYNAMODB_ENDPOINT;
}

table = new AWS.DynamoDB.DocumentClient();

exports.saveResult = result => {
    let params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: result.order.order_id
        },
    };

    let timestamp = new Date().toISOString();

    if (result.error)  {
        params.UpdateExpression = 'set ' + [
            '#i.bau.last_result = :last_result',
            '#i.bau.last_timestamp = :now',
            '#i.bau.#e = list_append(#i.bau.#e, :error)'
        ].join(', ');

        params.ExpressionAttributeNames = {
            '#i': 'integrations',
            '#e': 'error_history'
        };

        params.ExpressionAttributeValues = {
            ':last_result': 'error',
            ':now': timestamp,
            ':error': [
                {
                    integration_timestamp: timestamp,
                    error_message: result.error.toString()
                }
            ]
        };
    } else {
        params.UpdateExpression = 'set ' + [
            'integrations.bau.last_result = :res',
            'integrations.bau.last_timestamp = :now'
        ].join(', ');

        params.ExpressionAttributeValues = {
            ':res': 'ok',
            ':now': timestamp
        };
    }

    console.log('[saveResult' + ' - ' + result.order.order_id + '] Parameters', params);

    return table.update(params).promise()
        .then(() => {
            if (result.error) {
                return Promise.reject(result);
            }

            return Promise.resolve(result);
        });
};