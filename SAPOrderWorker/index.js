'use strict';

var soap = require('soap');

var wsdl = './sap-service.wsdl';

var soapOptions = {
};

function work(order, callback) {

}

exports.handler = function(event, context, callback) {


    /**
     * AD_SMTPADR: mail de cliente
     * AUART: Clase de documento (puede ser ZPSI -> pedido, ZCI -> NC financiara, ZCIR -> NC que sube stock).
     * AUGRU: motivo de pedido (0001)
     * BSTDK: Fecha de pedido
     * BSTKD: Número de pedido (el de Glamit que es de 11 dígitos y comienza con 127)
     * IHREZ: operación de mercado pago (comprobante de 9 dígitos).
     * KUNNR: Cliente (Dato Fijo Y600999)
     * NAME1: Nombre del cliente
     * NAME4: DNI de cliente (Este campo va a ser reemplazado por otro TBD)
     * SPART: Sector (es 02)
     * T_CONDITIONS: Condiciones
     * T_ITEMS: Posición de pedido
     * T_RETURN
     * VBELN_EXT: Referencia al pedido original en las Notas de Credito. No es mandatorio
     * VKORG: Organización de ventas (es 0002)
     * VTWEG: Canal (es 02)
     *
     * T_CONDITIONS (Puede haber N condiciones por cada posición de T_ITEMS)
     * KPOSN: posición de la condición. Referencia a la posicion en T_ITEMS. Se puede repetir. Vacio en las cond. de cabecera
     * KSCHL: Nombre de condición. Ver mail de mapeo de condiciones
     * KBETR: Valor de condición. Valor absoluto en pesos
     * WAERS: Moneda de condición. NO es un dato fijo. Si el campo KSCHL tiene una condición de porcentaje, este campo va vacío.
     *
     * Posición de pedido: T_ITEMS
     * POSNR: Posición de 6 dígitos. Número de 10 en 10. Ej: 10 para el primer ítem, 20 para el segundo, etc.
     * MATNR: Material (SKU del producto -> Codigo SAP)
     * WERKS: Centro (SALN)
     * MENGE: Cantidad
     * MEINS: Unidad de medida (EJE)
     * MVGR5: grupo de material 5 (cuando es 30, corresponde a pedido, cuando es 31 a nota de crédito)
     * KDMAT: Descripción de material
     * POSEX: Posición, replica el valor de POSNR
     *
     * Costo de envio
     * Es una CONDITION
     *      KSCHL = ZCEI
     *      KPOSN = (vacio)
     *
     * Notas de credito. Sigue sin quedar claro
     */

    var params = {
        AD_SMTPADR: 'devteam@semexpert.com.ar',  // !!!
        AUART: 'ZPSI',
        AUGRU: '0001',
        BSTDK: '2001-01-01',  // !!!
        BSTKD: '12700000001',  // !!!
        IHREZ: '123456789',  // !!!
        KUNNR: 'Y600999',
        NAME1: 'Juan Perez',  // !!!
        NAME4: '12345678',  // !!!
        SPART: '02',
        T_CONDITIONS: [  // ???
            {
                KPOSN: '',  // ???
                KSCHL: '',  // ???
                KBETR: '',  // ???
                WAERS: ''  // ???
            }
        ],
        T_ITEMS: [
            {
                POSNR: 10,  // !!!
                MATNR: '123', // !!!
                WERKS: 'SALN',
                MENGE: '1',  // !!!
                MEINS: 'EJE',
                MVGR5: 30,
                KDMAT: 'Spiderman', // !!!
                POSEX: 10  // !!!
            }
        ],
        T_RETURN: [], // ???
        VKORG: '0002',
        VTWEG: '02'
    };

    soap.createClient(wsdl, soapOptions, function(err, client) {
        if (err) {
            callback(err);
        }

        //client.addSoapHeader(soapHeader, '', 'wsa', 'http://www.w3.org/2005/08/addressing');

        client.ZWS_GEN_PED(params, function(err, data) {
            if (err) {
                callback(err);
            }

            callback(null, data);
        });
    });
};