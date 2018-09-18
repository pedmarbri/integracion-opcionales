'use strict';

const soap = require('soap');

const LN_STACK = String(process.env.LN_STACK);
const WSDL_URI = './sap-service-' + LN_STACK.toLowerCase() + '.wsdl';

// Service Credentials
const SAP_HTTP_USER = 'webservice';
const SAP_HTTP_PASS = '12345678';

// Fixed Values
const DOCUMENT_TYPE_CM_STOCK = 'ZCRI';
const DOCUMENT_TYPE_CM_FINANCE = 'ZCI';
const ORDER_REASON_CODE = '001';
const CENTER_CODE = 'SALN';
const WAREHOUSE = 'GSTK';
const MEASUREMENT_UNIT = 'EJE';
const MATERIAL_GROUP_5 = 31;

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

const formatPriceCondition = item => {
    let priceType = UNIT_PRICE_CONDITION;

    if (item.flags && item.flags.indexOf('exclusive') > -1) {
        priceType = EXCLUSIVE_PRICE_CONDITION;
    }

    return {
        KPOSN: item.sap_row,
        KSCHL: priceType,
        KBETR: item.refund_amount,
        WAERS: CONDITION_CURRENCY
    };
};

const formatDiscountCondition = item => {
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
        discountAmount = discountIsPercent ? item.discount_percent : Math.round(item.discount_amount / item.refund_amount * 100);
        discountIsPercent = true;
    }

    return {
        KPOSN: item.sap_row,
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

    return {
        item: conditions
    };
};

const formatItems = orderItems => ({
    item: orderItems.map(item => ({
        POSNR: item.sap_row,
        MATNR: item.sku,
        WERKS: CENTER_CODE,
        LGORT: WAREHOUSE,
        MENGE: item.qty,
        MEINS: MEASUREMENT_UNIT,
        MVGR5: MATERIAL_GROUP_5,
        KDMAT: item.name,
        POSEX: item.sap_row
    }))
});

const formatDocumentType = creditmemo => {
    const returnsStock = creditmemo.items.find(item => {
        console.log(item);
        return item.hasOwnProperty('return_stock') && item.return_stock;
    });
    return returnsStock ? DOCUMENT_TYPE_CM_STOCK : DOCUMENT_TYPE_CM_FINANCE;
};

const formatRequest = creditmemo => ({
    AUART: formatDocumentType(creditmemo),
    AUGRU: ORDER_REASON_CODE,
    BSTDK: formatDate(creditmemo.timestamp),
    BSTKD: creditmemo.order_id,
    IHREZ: null,
    T_CONDITIONS: formatConditions(creditmemo.items, creditmemo.totals),
    T_ITEMS: formatItems(creditmemo.items),
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
    VBELN_REF: creditmemo.sap_order_id,
});

exports.sendCreditMemo = creditmemo => {
    const callSapService = client => {
        const auth = 'Basic ' + new Buffer(SAP_HTTP_USER + ':' + SAP_HTTP_PASS).toString('base64');
        const request = formatRequest(creditmemo);
        const options = {
            timeout: 60000
        };

        client.addHttpHeader('Authorization', auth);
        console.log('[sendCreditMemo' + ' - ' + creditmemo.order_id + ']', JSON.stringify(request));

        return client.ZWS_GEN_NCAsync(request, options);
    };

    return soap.createClientAsync(WSDL_URI)
        .then(callSapService);
};