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

//Sale_Type from Glamit
const ONESHOT_DES = 'oneshot';
const SUSCRIPTION_DES = 'suscription';
const MELI_DES = 'meli';
//Sale_Type value convertion
const ONESHOT = '31';
const SUSCRIPTION = '33';
const MELI = '35';

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

// Avoid huge numbers
const restrictNumber = function (num) {
    return Math.min(num, Math.pow(10, 10));
};

const formatTransactionId = payment => {
    if (!payment.transaction_id) {
        return null;
    }

    return payment.transaction_id.substr(0, 12);
};

const formatCustomerName = customer => (customer.first_name + ' ' + customer.last_name).substr(0, 30);
const formatCustomerIdNumber = customer => customer.id_number.substr(0, 30);

const formatPriceCondition = (item, index) => {
    let priceType = UNIT_PRICE_CONDITION;

    if (item.flags && item.flags.indexOf('exclusive') > -1) {
        priceType = EXCLUSIVE_PRICE_CONDITION;
    }

    return {
        KPOSN: (index + 1) * 10,
        KSCHL: priceType,
        KBETR: restrictNumber(item.list_price),
        WAERS: CONDITION_CURRENCY
    };
};

const formatDiscountCondition = (item, index) => {
    if (item.discount_percent === 0 && item.discount_amount === 0) {
        return null;
    }

    if (item.discount_percent > 100) {
        throw new Error("El porcentaje de descuento no puede ser mayor al 100%");
    }

    let discountIsPercent = item.discount_percent > 0;
    let discountType = discountIsPercent ? PERCENT_DISCOUNT_CONDITION : FIXED_DISCOUNT_CONDITION;
    let discountAmount = discountIsPercent ? item.discount_percent : item.discount_amount;

    /**
     * Exclusive products always express the discount as percentual
     */
    if (item.flags && item.flags.indexOf('exclusive') > -1) {
        discountType = EXCLUSIVE_DISCOUNT_CONDITION;
        discountAmount = discountIsPercent ? item.discount_percent : Math.round(item.discount_amount / item.list_price * 100);
        discountIsPercent = true;
    }

    return {
        KPOSN: (index + 1) * 10,
        KSCHL: discountType,
        KBETR: restrictNumber(discountAmount),
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
        KBETR: restrictNumber(totals.shipping),
        WAERS: CONDITION_CURRENCY
    };
};

const formatConditions = (items, totals) => {
    const conditions = [];

    items.forEach(function (item, index) {
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

exports.sendOrder = order => {
    try {
        console.log('[sendOrder' + ' - ' + order.order_id + '] Sending order to SAP');
        const sapRows = {};

        const formatItems = orderItems => ({
            item: orderItems.map((item, index) => {
                let MATERIAL_GROUP_5;
                const sapRow = (index + 1) * 10;

                sapRows[item.sku] = sapRow;

                if (typeof item.sale_type !== 'undefined' || item.sale_type !=='' || item.sale_type !== null) {
                    switch (item.sale_type) {
                        case ONESHOT_DES:
                            MATERIAL_GROUP_5 = ONESHOT;
                            break;
                        case SUSCRIPTION_DES:
                            MATERIAL_GROUP_5 = SUSCRIPTION;
                            break;
                        case MELI_DES:
                            MATERIAL_GROUP_5 = MELI;
                            break;
                        default:
                            MATERIAL_GROUP_5 = ONESHOT;
                    }
                } else {
                    MATERIAL_GROUP_5 = ONESHOT;
                }
                return {
                    POSNR: sapRow,
                    MATNR: item.sku.substr(0, 18),
                    WERKS: CENTER_CODE,
                    LGORT: WAREHOUSE,
                    MENGE: restrictNumber(item.qty),
                    MEINS: MEASUREMENT_UNIT,
                    MVGR5: MATERIAL_GROUP_5,
                    KDMAT: item.name.substr(0, 35),
                    POSEX: String(sapRow)
                };
            })
        });

        const formatRequest = order => ({
            AD_SMTPADR: order.customer.email.substr(0, 241),
            AUART: DOCUMENT_TYPE_ORDER,
            AUGRU: ORDER_REASON_CODE,
            BSTDK: formatDate(order.timestamp),
            BSTKD: order.order_id.substr(0, 35),
            CITY: 'CABA',
            COUNTRY: 'AR',
            IHREZ: formatTransactionId(order.payment),
            KUNNR: order.crm_contact_id,
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

        const callSapService = client => {
            const auth = 'Basic ' + new Buffer(SAP_HTTP_USER + ':' + SAP_HTTP_PASS).toString('base64');
            const request = formatRequest(order);
            const options = {
                timeout: 60000
            };

            client.addHttpHeader('Authorization', auth);
            console.log('[sendOrder' + ' - ' + order.order_id + '] Request Parameters', JSON.stringify(request));

            return client.ZWS_GEN_PEDAsync(request, options)
                .then(result => {
                    console.log('[sendOrder' + ' - ' + order.order_id + '] XML Request', client.lastRequest);
                    console.log('[sendOrder' + ' - ' + order.order_id + '] Result', JSON.stringify(result));
                    console.log('[sendOrder' + ' - ' + order.order_id + '] XML Response', client.lastResponse);

                    if (result[0] && result[0].VBELN) {
                        order.sap_id = result[0].VBELN;
                    }

                    return Promise.resolve({
                        result: result[0],
                        order: order,
                        rows: sapRows
                    });
                })
                .catch(error => {
                    console.log('[sendOrder' + ' - ' + order.order_id + '] XML Request', client.lastRequest);
                    console.log('[sendOrder' + ' - ' + order.order_id + '] Error', JSON.stringify(error));
                    console.log('[sendOrder' + ' - ' + order.order_id + '] XML Response', client.lastResponse);
                    return Promise.reject(error);
                });
        };

        return soap.createClientAsync(WSDL_URI)
            .then(callSapService);
    } catch (error) {
        return Promise.reject(error);
    }
};