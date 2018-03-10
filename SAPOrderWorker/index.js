'use strict';

var soap = require('soap');

var wsdl = './sap-service.wsdl';

var soapOptions = {
};

function work(order, callback) {

}

exports.handler = function(event, context, callback) {
    var dateObj = new Date();

    var date = dateObj.getFullYear() + "-" + dateObj.getMonth() + '-' + dateObj.getDate() + '-' +dateObj.getHours() + '-' + dateObj.getMinutes() + '-' + dateObj.getSeconds();
    var date2 = dateObj.getFullYear() + "-" + dateObj.getMonth() + '-' + dateObj.getDate();

    var params = {
        AD_SMTPADR: 'devteam@semexpert.com.ar',  // !!!
        AUART: 'ZPSI',
        AUGRU: '001',  // Efectivamente el maximo es de 3 caracteres!!!!!!!!!
        BSTDK: dateObj.toISOString().replace(/[^0-9]/g, '').substr(0, 8),  // !!! // No le gust el formato con guiones!!!!!!!!!!
        BSTKD: dateObj.toISOString().replace(/[^0-9]/g, '').substr(0, 11),  // !!!
        IHREZ: '123456789',  // !!!
        KUNNR: 'Y600099',
        NAME1: 'Juan Perez',  // !!!
        NAME4: '12345678',  // !!!
        SPART: '02',
        T_CONDITIONS: {
            item: [  // ???  // Es obligatorio mandar por lo menos una!!!!!!
                {
                    KPOSN: 10,  // ???
                    KSCHL: 'ZPBI',  // ???
                    KBETR: 42.65,  // ???
                    WAERS: 'ARK'  // ???
                },
                {
                    KPOSN: null,  // ???
                    KSCHL: 'ZCEI',  // ???
                    KBETR: 42.65,  // ???
                    WAERS: 'ARK'  // ???
                }
            ]
        },
        T_ITEMS: {
            item: [
                {
                    POSNR: 10,  // !!!
                    MATNR: 'OPC110741008', // !!!
                    WERKS: 'SALN',
                    LGORT: 'GSTK',
                    MENGE: '1',  // !!!
                    MEINS: 'EJE',
                    MVGR5: 30,
                    KDMAT: 'Spiderman', // !!!
                    POSEX: 10  // !!!
                }
            ]
        },
        T_RETURN: {
            item: [  // ??? // Es obligatorio!!!!!!!
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

    var auth = "Basic " + new Buffer("webservice" + ":" + "12345678").toString("base64");

    soap.createClient(wsdl, soapOptions, function(err, client) {
        if (err) {
            callback(err);
        }

        //client.addSoapHeader(soapHeader, '', 'wsa', 'http://www.w3.org/2005/08/addressing');
        client.addHttpHeader('Authorization', auth);

        client.ZWS_GEN_PED(params, function(err, data) {
            if (err) {
                callback(err);
            }

            // callback(null, data);
            callback(client.lastRequest, client.lastResponse);
        });
    });
};
