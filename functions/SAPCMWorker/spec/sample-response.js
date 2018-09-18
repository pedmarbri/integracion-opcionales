'use strict';

module.exports = {
    'T_CONDITIONS': {
        'item': [{
            'KPOSN': '000010',
            'KSCHL': 'ZPEE',
            'KBETR': '199.9',
            'WAERS': 'ARK'
        }, { 'KPOSN': '000010', 'KSCHL': 'ZBEE', 'KBETR': '25.0', 'WAERS': null }, {
            'KPOSN': '000000',
            'KSCHL': 'ZCEI',
            'KBETR': '35.0',
            'WAERS': 'ARK'
        }]
    },
    'T_ITEMS': {
        'item': {
            'POSNR': '000010',
            'MATNR': 'OPC11083000009',
            'WERKS': 'SALN',
            'LGORT': 'GSTK',
            'MENGE': '1.0',
            'MEINS': 'EJE',
            'MVGR5': '30',
            'KDMAT': 'SCANIA-P380 SNOW REMOVER',
            'POSEX': '10'
        }
    },
    'T_RETURN': {
        'item': [{
            'TYPE': 'E',
            'ID': 'V1',
            'NUMBER': '515',
            'MESSAGE': 'No tiene autorización p.actualizar documentos de ventas en 0002 02 02',
            'LOG_NO': null,
            'LOG_MSG_NO': '000000',
            'MESSAGE_V1': '0002',
            'MESSAGE_V2': '02',
            'MESSAGE_V3': '02',
            'MESSAGE_V4': null,
            'PARAMETER': 'SALES_HEADER_IN',
            'ROW': '0',
            'FIELD': null,
            'SYSTEM': 'ALE_ADM'
        }, {
            'TYPE': 'E',
            'ID': 'V4',
            'NUMBER': '219',
            'MESSAGE': 'El documento de venta no se modifica',
            'LOG_NO': null,
            'LOG_MSG_NO': '000000',
            'MESSAGE_V1': null,
            'MESSAGE_V2': '02',
            'MESSAGE_V3': '02',
            'MESSAGE_V4': null,
            'PARAMETER': null,
            'ROW': '0',
            'FIELD': null,
            'SYSTEM': 'ALE_ADM'
        }]
    },
    'VBELN': '1234567890'
};