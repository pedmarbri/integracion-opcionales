'use strict';

const soap = require('soap');

const LN_STACK = String(process.env.LN_STACK);
const WSDL_URI = './sap-service-' + LN_STACK.toLowerCase() + '.wsdl';

// Service Credentials
const SAP_HTTP_USER = 'webservice';
const SAP_HTTP_PASS = '12345678';

// Fixed Values
const DOCUMENT_TYPE_ORDER = 'ZPSI';
const ORDER_REASON_CODE = '001';
const LANGUAGE_CODE = 'S';
const SECTOR_CODE = '02';
const SALES_ORGANIZATION = '0002';
const SALES_CHANNEL = '02';
const CENTER_CODE = 'SALN';
const WAREHOUSE = 'GSTK';
const MEASUREMENT_UNIT = 'EJE';
const MATERIAL_GROUP_5 = 30;

// Condition types
const UNIT_PRICE_CONDITION = 'ZPBI';
const EXCLUSIVE_PRICE_CONDITION = 'ZPEE';
const SHIPPING_CONDITION = 'ZCEI';
const PERCENT_DISCOUNT_CONDITION = 'ZBP1';
const FIXED_DISCOUNT_CONDITION = 'ZBP';
const EXCLUSIVE_DISCOUNT_CONDITION = 'ZBEE';
const CONDITION_CURRENCY = 'ARK';

const formatDate = isoDate => {
    const dateObj = new Date(isoDate);

    const mm = dateObj.getMonth() + 1;
    const dd = dateObj.getDate();
    return [
        dateObj.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join('');
};

const formatTransactionId = payment => payment.transaction_id;
const formatCustomerName = customer => customer.first_name + ' ' + customer.last_name;
const formatCustomerIdNumber = customer => customer.id_number;

const formatPriceCondition = (item, index) => {
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
};

const formatDiscountCondition = (item, index) => {
    if (item.discount_percent === 0 && item.discount_amount === 0) {
        return null;
    }

    let discountIsPercent = item.discount_percent > 0;
    let discountType = discountIsPercent ? PERCENT_DISCOUNT_CONDITION : FIXED_DISCOUNT_CONDITION;
    let discountAmount = discountIsPercent ? item.discount_percent : item.discount_amount;

    /**
     * Exclusive products always express the discount as percentual
     */
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
};

const formatShippingCondition = totals => {
    if (totals.shipping === 0) {
        return null;
    }

    return {
        KPOSN: null,
        KSCHL: SHIPPING_CONDITION,
        KBETR: totals.shipping,
        WAERS: CONDITION_CURRENCY
    };
};

const formatConditions = (items, totals) => {
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
};

const formatItems = orderItems => ({
    item: orderItems.map((item, index) => ({
        POSNR: (index + 1) * 10,
        MATNR: item.sku,
        WERKS: CENTER_CODE,
        LGORT: WAREHOUSE,
        MENGE: item.qty,
        MEINS: MEASUREMENT_UNIT,
        MVGR5: MATERIAL_GROUP_5,
        KDMAT: item.name,
        POSEX: (index + 1) * 10
    }))
});

const formatRequest = order => ({
    AD_SMTPADR: order.customer.email,
    AUART: DOCUMENT_TYPE_ORDER,
    AUGRU: ORDER_REASON_CODE,
    BSTDK: formatDate(order.timestamp),
    BSTKD: order.order_id,
    CITY: 'CABA',
    COUNTRY: 'AR',
    IHREZ: formatTransactionId(order.payment),
    KUNNR: LN_STACK === 'Production' ? 'Y600022' : 'Y600099',
    LANGU: LANGUAGE_CODE,
    NAME1: formatCustomerName(order.customer),
    NAME4: formatCustomerIdNumber(order.customer),
    SPART: SECTOR_CODE,
    T_CONDITIONS: formatConditions(order.items, order.totals),
    T_ITEMS: formatItems(order.items),
    T_RETURN: {
        item: [
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
    VKORG: SALES_ORGANIZATION,
    VTWEG: SALES_CHANNEL
});

exports.sendOrder = order => {
    const callSapService = client => {
        const auth = 'Basic ' + new Buffer(SAP_HTTP_USER + ':' + SAP_HTTP_PASS).toString('base64');
        const request = formatRequest(order);
        const options = {
            timeout: 10000
        };

        client.addHttpHeader('Authorization', auth);
        console.log(JSON.stringify(request));

        return client.ZWS_GEN_PEDAsync(request, options)
            .then(result => {
                console.log(JSON.stringify(result));

                // if (!result.VBELN) {
                //     return Promise.reject(Error(result.T_RETURN.item[0].MESSAGE));
                // }

                return Promise.resolve({
                    result: result,
                    order: order
                });
            });
    };

    return soap.createClientAsync(WSDL_URI)
        .then(callSapService);
};