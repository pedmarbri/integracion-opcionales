'use strict';

const AWS = require('aws-sdk');

const ORDER_TABLE = process.env.ORDER_TABLE;

const table = new AWS.DynamoDB.DocumentClient();

function formatErrorMessage(error) {
    let message = '[' + error.ID + '-' + error.NUMBER + ']';
    message += ' (' + error.PARAMETER;

    if (error.PARAMETER !== 'SALES_HEADER_IN') {
        message += ' ' + error.ROW;
    }

    message += ') ' + error.MESSAGE;
    return message;
}

const saveError = sapResult => {
    const now = new Date().toISOString();
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
            ':now': now,
            ':errors': sapResult.result.T_RETURN.item
                .filter(error => error.TYPE === 'E' && error.NUMBER !== '219')
                .map(error => {
                    return {
                        integration_timestamp: now,
                        error_message: formatErrorMessage(error)
                    };
                })
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(sapResult.order));
};

exports.saveResult = sapResult => {
    console.log("Saving Result to DB");

    if (!sapResult.result.VBELN) {
        return saveError(sapResult).then(() => Promise.reject(new Error('The result was erroneous.')));
    }

    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: sapResult.order.order_id
        },
        UpdateExpression: 'set #i.sap.last_result = :lr, #i.sap.last_timestamp = :now, sap_id = :si',
        ExpressionAttributeNames: {
            '#i': 'integrations'
        },
        ExpressionAttributeValues: {
            ':lr': 'ok',
            ':si': sapResult.result.VBELN,
            ':now': new Date().toISOString()
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(sapResult.order));
};
