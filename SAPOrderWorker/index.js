'use strict';

const soap = require('soap');
const AWS = require('aws-sdk');

const LN_STACK = process.env.LN_STACK;
const WSDL_URI = './sap-service-' + LN_STACK.toLowerCase() + '.wsdl';
const TASK_QUEUE_URL = process.env.SAP_ORDER_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;
const SAP_HTTP_USER = 'webservice';
const SAP_HTTP_PASS = '12345678';

// Condition types
const UNIT_PRICE_CONDITION = 'ZPBI';
const EXCLUSIVE_PRICE_CONDITION = 'ZPEE';
const SHIPPING_CONDITION = 'ZCEI';
const PERCENT_DISCOUNT_CONDITION = 'ZBP1';
const FIXED_DISCOUNT_CONDITION = 'ZBP';
const EXCLUSIVE_DISCOUNT_CONDITION = 'ZBEE';
const CONDITION_CURRENCY = 'ARK';

const sqs = new AWS.SQS({region: AWS_REGION});

function deleteMessage(receiptHandle, cb) {
    sqs.deleteMessage({
        ReceiptHandle: receiptHandle,
        QueueUrl: TASK_QUEUE_URL
    }, cb);
}

const soapOptions = {
};

function formatDate(isoDate) {
    const dateObj = new Date(isoDate);
    const mm = dateObj.getMonth() + 1;
    const dd = dateObj.getDate();
    return [
        dateObj.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join('');
}

function formatOrderNum(orderNum) {
    return '127' + orderNum.substr(orderNum.length - 8);
}

function formatTransactionId(payment) {
    return payment.transaction_id;
}

function formatCustomerName(customer) {
    return customer.first_name + ' ' + customer.last_name;
}

function formatCustomerIdNumber(customer) {
    return customer.id_number;
}

function formatPriceCondition(item, index) {
    let priceType = UNIT_PRICE_CONDITION;

    if (item.flags && item.flags.indexOf('exclusive') > -1) {
        priceType = EXCLUSIVE_PRICE_CONDITION;
    }

    return {
        KPOSN: (index + 1) * 10,
        KSCHL: priceType,
        KBETR: item.list_price,
        WAERS: CONDITION_CURRENCY
    };
}

function formatDiscountCondition(item, index) {
    if (item.discount_percent === 0 && item.discount_amount === 0) {
        return null;
    }

    let discountIsPercent = item.discount_percent > 0;
    let discountType = discountIsPercent ? PERCENT_DISCOUNT_CONDITION : FIXED_DISCOUNT_CONDITION;
    let discountAmount = discountIsPercent ? item.discount_percent : item.discount_amount;

    if (item.flags && item.flags.indexOf('exclusive') > -1) {
        discountType = EXCLUSIVE_DISCOUNT_CONDITION;
        discountAmount = discountIsPercent ? item.discount_percent : Math.round(item.discount_amount / item.list_price);
    }

    return {
        KPOSN: (index + 1) * 10,
        KSCHL: discountType,
        KBETR: discountAmount,
        WAERS: discountIsPercent ? null : CONDITION_CURRENCY
    };
}

function formatShippingCondition(totals) {
    if (totals.shipping === 0) {
        return null;
    }

    return {
        KPOSN: null,
        KSCHL: SHIPPING_CONDITION,
        KBETR: totals.shipping,
        WAERS: CONDITION_CURRENCY
    };
}

function formatConditions(items, totals) {
    const conditions = [];

    items.forEach(function(item, index) {
        conditions.push(formatPriceCondition(item, index));
        let discountCondition = formatDiscountCondition(item, index);
        if (discountCondition) {
            conditions.push(discountCondition);
        }
    });

    const shipping = formatShippingCondition(totals);

    if (shipping) {
        conditions.push(shipping);
    }

    return {item: conditions};
}

function formatItems(orderItems) {
    const items = [];

    orderItems.forEach(function(item, index) {
        const rowPosition = (index + 1) * 10;
        items.push ({
            POSNR: rowPosition,
            MATNR: item.sku,
            WERKS: 'SALN',
            LGORT: 'GSTK',
            MENGE: item.qty,
            MEINS: 'EJE',
            MVGR5: 30,
            KDMAT: item.name, // !!!
            POSEX: rowPosition
        });
    });


    return {
        item: items
    };
}

function work(order, callback) {
    console.log(order);

    soap.createClient(WSDL_URI, soapOptions, function(err, client) {
        if (err) {
            callback(err);
        }

        const auth = 'Basic ' + new Buffer(SAP_HTTP_USER + ':' + SAP_HTTP_PASS).toString('base64');

        client.addHttpHeader('Authorization', auth);

        const params = {
            AD_SMTPADR: order.customer.email,
            AUART: 'ZPSI',
            AUGRU: '001',
            BSTDK: formatDate(order.timestamp),
            BSTKD: formatOrderNum(order.order_id),
            CITY: 'CABA',
            COUNTRY: 'AR',
            IHREZ: formatTransactionId(order.payment),
            KUNNR: LN_STACK === 'Production' ? 'Y600022' : 'Y600099',
            LANGU: 'S',
            NAME1: formatCustomerName(order.customer),
            NAME4: formatCustomerIdNumber(order.customer),
            SPART: '02',
            T_CONDITIONS: formatConditions(order.items, order.totals),
            T_ITEMS: formatItems(order.items),
            T_RETURN: {
                item: [  // Es obligatorio!!!!!!!
                    {
                        TYPE: '?',
                        ID: '?',
                        NUMBER: null,
                        MESSAGE: null,
                        LOG_NO: null,
                        LOG_MSG_NO: null,
                        MESSAGE_V1: null,
                        MESSAGE_V2: null,
                        MESSAGE_V3: null,
                        MESSAGE_V4: null,
                        PARAMETER: null,
                        ROW: null,
                        FIELD: null,
                        SYSTEM: null
                    }
                ],
            },
            VBELN_EXT: null,
            VKORG: '0002',
            VTWEG: '02'
        };

        console.log(JSON.stringify(params));

        client.ZWS_GEN_PED(params, function(err, data) {
            console.log(client.lastRequest);
            if (err) {
                callback(err);
            }

            console.log(client.lastResponse);
            callback();
        }/*, {timeout: 10000}*/);
    });
}

exports.handler = function(event, context, callback) {
    work(JSON.parse(event.Body), function(err) {
        if (err) {
            callback(err);
        } else {
            deleteMessage(event.ReceiptHandle, callback);
        }
    });
};
