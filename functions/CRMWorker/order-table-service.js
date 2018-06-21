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
            'integrations.crm.last_result = :res',
            'integrations.crm.last_timestamp = :now',
            'crm_contact_id = if_not_exists(crm_contact_id, :ccid)'
        ].join(', ');

        console.log(JSON.stringify(result.contact));

        params.ExpressionAttributeValues = {
            ':res': 'ok',
            ':now': timestamp,
            ':ccid': result.contact.CRMID
        };

        if (result.contact.AddressId) {
            params.UpdateExpression += ', crm_address_id = if_not_exists(crm_address_id, :caid)';
            params.ExpressionAttributeValues[':caid'] = result.contact.AddressId;
        }
    }

    console.log('[saveResult] Parameters', params);

    return table.update(params).promise()
        .then(() => {
            if (result.error) {
                return Promise.reject(result);
            }

            return Promise.resolve(result);
        });
};