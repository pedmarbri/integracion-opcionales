'use strict';

const AWS = require('aws-sdk');
const ORDER_TABLE = process.env.ORDER_TABLE;
const table = new AWS.DynamoDB.DocumentClient();

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
            '#i.crm.last_result = :last_result',
            '#i.crm.last_timestamp = :now',
            '#i.crm.#e = list_append(#i.crm.#e, :error)'
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
            'integrations.crm.last_result = ok',
            'integrations.crm.last_timestamp = :now',
            'crm_contact_id = :ccid',
            'crm_address_id = :caid'
        ].join(', ');

        params.ExpressionAttributeValues = {
            ':now': timestamp,
            ':ccid': result.contact.CRMID,
            ':caid': result.contact.AddressId
        };

    }


    return table.update(params).promise()
        .then(() => {
            if (result.error) {
                return Promise.reject(result);
            }

            return Promise.resolve(result);
        });
};