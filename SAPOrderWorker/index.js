'use strict';

var soap = require('soap');
var AWS = require('aws-sdk');

var WSDL_URI = './sap-service.wsdl';
var TASK_QUEUE_URL = process.env.SAP_ORDER_QUEUE_URL;
var AWS_REGION = process.env.AWS_REGION;
var  SAP_HTTP_USER = 'webservice';
var  SAP_HTTP_PASS = '12345678';

// Condition types
var UNIT_PRICE_CONDITION = 'ZPBI';
var EXCLUSIVE_PRICE_CONDITION = 'ZPEE';
var SHIPPING_CONDITION = 'ZCEI';
var PERCENT_DISCOUNT_CONDITION = 'ZBP1';
var FIXED_DISCOUNT_CONDITION = 'ZBP';
var CONDITION_CURRENCY = 'ARK';

var sqs = new AWS.SQS({region: AWS_REGION});

function deleteMessage(receiptHandle, cb) {
    sqs.deleteMessage({
        ReceiptHandle: receiptHandle,
        QueueUrl: TASK_QUEUE_URL
    }, cb);
}

var soapOptions = {
};

function formatDate(isoDate) {
    var dateObj = new Date(isoDate);
    var mm = dateObj.getMonth() + 1;
    var dd = dateObj.getDate();
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
    var priceType = UNIT_PRICE_CONDITION;

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

    var discountIsPercent = item.discount_percent > 0;

    return {
        KPOSN: (index + 1) * 10,
        KSCHL: discountIsPercent ? PERCENT_DISCOUNT_CONDITION : FIXED_DISCOUNT_CONDITION,
        KBETR: discountIsPercent ? item.discount_percent : item.discount_amount,
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
    var conditions = [];

    items.forEach(function(item, index) {
        conditions.push(formatPriceCondition(item, index));
        var discountCondition = formatDiscountCondition(item, index);
        if (discountCondition) {
            conditions.push(discountCondition);
        }
    });

    var shipping = formatShippingCondition(totals);

    if (shipping) {
        conditions.push(shipping);
    }

    return {item: conditions};
}

function formatItems(orderItems) {
    var items = [];

    orderItems.forEach(function(item, index) {
        var rowPosition = (index + 1) * 10;
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

        var auth = "Basic " + new Buffer(SAP_HTTP_USER + ":" + SAP_HTTP_PASS).toString("base64");

        client.addHttpHeader('Authorization', auth);

        var params = {
            AD_SMTPADR: order.customer.email,
            AUART: 'ZPSI',
            AUGRU: '001',
            BSTDK: formatDate(order.timestamp),
            BSTKD: formatOrderNum(order.order_id),
            IHREZ: formatTransactionId(order.payment),
            KUNNR: 'Y600099',
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
        callback();

        // client.ZWS_GEN_PED(params, function(err, data) {
        //     console.log(client.lastRequest);
        //     if (err) {
        //         callback(err);
        //     }
        //
        //     console.log(client.lastResponse);
        //     callback();
        // });
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
