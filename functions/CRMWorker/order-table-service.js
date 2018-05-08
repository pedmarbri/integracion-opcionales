'use strict';

const AWS = require('aws-sdk');
const ORDER_TABLE = process.env.ORDER_TABLE;
const table = new AWS.DynamoDB.DocumentClient();

exports.saveResult = result => {
    const params = {
        TableName: ORDER_TABLE,
        Key: {
            order_id: result.order.order_id
        },
        UpdateExpression: 'set ' + [
            'integrations.crm.last_result = ok',
            'integrations.crm.last_timestamp = :now',
            'crm_contact_id = :ccid',
            'crm_address_id = :caid'
        ].join(', '),
        ExpressionAttributeValues: {
            ':now': new Date().toISOString(),
            ':ccid': result.contact.CRMID,
            ':caid': result.contact.AddressId
        }
    };

    return table.update(params).promise()
        .then(() => Promise.resolve(result));
};