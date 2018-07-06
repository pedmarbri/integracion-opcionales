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
    console.log('[saveError' + ' - ' + sapResult.order.order_id + '] Saving error to DB');

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
            ':errors': []
        }
    };

    if (sapResult.result.error) {
        params.ExpressionAttributeValues[':errors'].push({
            integration_timestamp: now,
            error_message: sapResult.result.error.toString()
        });
    }

    if (sapResult.result.T_RETURN && sapResult.result.T_RETURN.item) {
        sapResult.result.T_RETURN.item
            .filter(error => error.TYPE === 'E' && error.NUMBER !== '219')
            .map(error => {
                return {
                    integration_timestamp: now,
                    error_message: formatErrorMessage(error)
                };
            })
            .forEach(error => {
                params.ExpressionAttributeValues[':errors'].push(error);
            });

    }


    return table.update(params).promise();
};

exports.saveResult = sapResult => {
    console.log('[saveResult' + ' - ' + sapResult.order.order_id + '] Saving Result to DB');

    if (sapResult.result.error || !sapResult.result.VBELN) {
        return saveError(sapResult)
            .then(() => Promise.reject(new Error('The result was erroneous.')));
    }

    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: sapResult.order.order_id
        },
        UpdateExpression: 'set #i.sap.last_result = :lr, #i.sap.last_timestamp = :now, sap_id = :si, sap_rows = :sr',
        ExpressionAttributeNames: {
            '#i': 'integrations'
        },
        ExpressionAttributeValues: {
            ':lr': 'ok',
            ':si': sapResult.result.VBELN,
            ':now': new Date().toISOString(),
            ':sr': sapResult.rows
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(sapResult.order));
};
