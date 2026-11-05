// Turns a query result (fields + rows in array mode) into file contents
// for "Save as ..." in the Query tab.

var csvStringify = require('csv-stringify/lib/sync');

/*::
interface ResultExporter_Field {
  name: string
  dataTypeID: number
} 
interface ResultExporter_Format {
  id: string
  label: string
  extension: string
  filterName: string
}
*/

var EXPORT_FORMATS /*: ResultExporter_Format[] */ = [
  {id: 'csv',        label: 'CSV',        extension: 'csv',  filterName: 'CSV File'},
  {id: 'json',       label: 'JSON',       extension: 'json', filterName: 'JSON File'},
  {id: 'typescript', label: 'TypeScript', extension: 'ts',   filterName: 'TypeScript File'},
  {id: 'javascript', label: 'JavaScript', extension: 'js',   filterName: 'JavaScript File'},
  {id: 'html',       label: 'HTML',       extension: 'html', filterName: 'HTML File'},
];

var HTML_STYLE = `
    body { font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; margin: 16px; color: #222; background: #fff; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 3px 8px; text-align: left; vertical-align: top; white-space: pre; }
    th { background: #f5f5f5; position: sticky; top: 0; }
    tr:nth-child(even) td { background: #fafafa; }
    td.null { color: #b8b8b8; }
    td.number { text-align: right; }
    @media (prefers-color-scheme: dark) {
      body { color: #e9e9e9; background: #1e1e1e; }
      th, td { border-color: #444; }
      th { background: #2d2d2d; }
      tr:nth-child(even) td { background: #252525; }
      td.null { color: #777; }
    }`;

// TypeScript types by postgres type OID. Used when a column has no
// non-null values to infer the type from. Values match what node-pg returns
// after normalizeValue (int8/numeric/dates come out as strings).
var JSON_OIDS = [114, 3802];
var JSON_ARRAY_OIDS = [199, 3807];
var OID_TS_TYPES = {
  16: 'boolean',
  21: 'number', 23: 'number', 26: 'number', 700: 'number', 701: 'number',
  1000: 'boolean[]',
  1005: 'number[]', 1007: 'number[]', 1021: 'number[]', 1022: 'number[]', 1028: 'number[]',
  1001: 'string[]', 1009: 'string[]', 1014: 'string[]', 1015: 'string[]', 1016: 'string[]',
  1115: 'string[]', 1182: 'string[]', 1183: 'string[]', 1185: 'string[]', 1187: 'string[]',
  1231: 'string[]', 1270: 'string[]', 2951: 'string[]',
  600: 'Record<string, unknown>', 718: 'Record<string, unknown>', // point, circle
};
var TS_TYPE_ORDER = ['string', 'number', 'boolean', 'Record<string, unknown>'];

var EXPORT_MODULE_SYSTEMS = ['module', 'commonjs'];
var IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

var ResultExporter = {
  FORMATS: EXPORT_FORMATS,

  findFormat (formatId /*: string */) /*: ResultExporter_Format */ {
    return EXPORT_FORMATS.find(f => f.id == formatId) || EXPORT_FORMATS[0];
  },

  // Same conversion the original CSV export used: dates (and moment
  // objects, intervals) become ISO strings, everything else as is.
  csvCell (val /*: any */) {
    return val && val.toISOString ? val.toISOString() : val;
  },

  toCsv (fields /*: ResultExporter_Field[] */, rows /*: any[][] */) /*: string */ {
    var records = [fields.map(f => f.name)];
    rows.forEach(row => {
      records.push(row.map(val => ResultExporter.csvCell(val)));
    });
    return csvStringify(records, {delimiter: ','});
  },

  // Value as it should appear in JSON / JS / TS output
  normalizeValue (val /*: any */) /*: any */ {
    if (val === null || val === undefined) return null;
    if (Buffer.isBuffer(val)) return '\\x' + val.toString('hex'); // bytea, same as psql shows it
    if (val.toISOString) return val.toISOString(); // Date, moment, interval
    if (Array.isArray(val)) return val.map(v => ResultExporter.normalizeValue(v));
    if (typeof val == 'object') {
      var obj = ResultExporter.newObject();
      Object.keys(val).forEach(key => {
        obj[key] = ResultExporter.normalizeValue(val[key]);
      });
      return obj;
    }
    return val;
  },

  // Column names used as object keys. Duplicate names (e.g. "id" from two
  // joined tables) would overwrite each other, so later ones get a suffix: id, id_2
  uniqueKeys (fields /*: ResultExporter_Field[] */) /*: string[] */ {
    var used = new Set();
    return fields.map(field => {
      var key = field.name, n = 1;
      while (used.has(key)) {
        n++;
        key = field.name + '_' + n;
      }
      used.add(key);
      return key;
    });
  },

  // Objects without prototype, so a column called "__proto__" is kept as a normal key
  newObject () /*: any */ {
    return Object.create(null);
  },

  toObjects (fields /*: ResultExporter_Field[] */, rows /*: any[][] */) /*: any[] */ {
    var keys = ResultExporter.uniqueKeys(fields);
    return rows.map(row => {
      var obj = ResultExporter.newObject();
      keys.forEach((key, i) => {
        obj[key] = ResultExporter.normalizeValue(row[i]);
      });
      return obj;
    });
  },

  toJson (fields /*: ResultExporter_Field[] */, rows /*: any[][] */) /*: string */ {
    return JSON.stringify(ResultExporter.toObjects(fields, rows), null, 2) + "\n";
  },

  // Object key in JS/TS source. "__proto__" must be computed, otherwise
  // an object literal would set the prototype instead of adding a key.
  propertyKey (key /*: string */) /*: string */ {
    if (key == '__proto__') return '["__proto__"]';
    return IDENTIFIER_REGEX.test(key) ? key : JSON.stringify(key);
  },

  // Like JSON.stringify(value, null, 2), but valid JS for NaN/Infinity
  // (float columns can contain them) and with unquoted keys where possible
  toJsLiteral (value /*: any */, indent /*::? : string */) /*: string */ {
    indent = indent || '';
    var inner = indent + '  ';

    if (value === null || value === undefined) return 'null';

    if (typeof value == 'number') {
      if (Number.isNaN(value)) return 'NaN';
      if (value === Infinity) return 'Infinity';
      if (value === -Infinity) return '-Infinity';
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length == 0) return '[]';
      var items = value.map(v => inner + ResultExporter.toJsLiteral(v, inner));
      return "[\n" + items.join(",\n") + "\n" + indent + "]";
    }

    if (typeof value == 'object') {
      var keys = Object.keys(value);
      if (keys.length == 0) return '{}';
      var props = keys.map(key => {
        return inner + ResultExporter.propertyKey(key) + ': ' + ResultExporter.toJsLiteral(value[key], inner);
      });
      return "{\n" + props.join(",\n") + "\n" + indent + "}";
    }

    // strings, booleans
    return JSON.stringify(value);
  },

  normalizeModuleSystem (moduleSystem /*::? : string */) /*: string */ {
    return EXPORT_MODULE_SYSTEMS.indexOf(moduleSystem) != -1 ? moduleSystem : 'module';
  },

  toJavascript (fields /*: ResultExporter_Field[] */, rows /*: any[][] */, moduleSystem /*::? : string */) /*: string */ {
    var data = ResultExporter.toJsLiteral(ResultExporter.toObjects(fields, rows));

    if (ResultExporter.normalizeModuleSystem(moduleSystem) == 'commonjs') {
      return `const result = ${data};\n\nmodule.exports = { result };\n`;
    } else {
      return `export const result = ${data};\n`;
    }
  },

  // Union of TS types for list of (normalized) values, without null.
  // Returns '' when there are no non-null values.
  inferTsType (values /*: any[] */) /*: string */ {
    var types = new Set();
    var arrayItems = [];
    var hasArrays = false;

    values.forEach(val => {
      if (val === null || val === undefined) return;
      if (Array.isArray(val)) {
        hasArrays = true;
        arrayItems.push(...val);
      } else if (typeof val == 'object') {
        types.add('Record<string, unknown>');
      } else if (typeof val == 'number' || typeof val == 'string' || typeof val == 'boolean') {
        types.add(typeof val);
      } else {
        types.add('unknown');
      }
    });

    var result = TS_TYPE_ORDER.filter(t => types.has(t));
    if (types.has('unknown')) result.push('unknown');

    if (hasArrays) {
      var itemType = ResultExporter.inferTsType(arrayItems) || 'unknown';
      if (arrayItems.some(v => v === null || v === undefined)) {
        itemType = itemType == 'unknown' ? 'unknown' : itemType + ' | null';
      }
      result.push(itemType.includes(' ') ? `(${itemType})[]` : `${itemType}[]`);
    }

    return result.join(' | ');
  },

  columnTsType (field /*: ResultExporter_Field */, values /*: any[] */) /*: string */ {
    var type;
    if (JSON_OIDS.indexOf(field.dataTypeID) != -1) {
      type = 'unknown'; // json can hold any value; unknown already includes null
    } else if (JSON_ARRAY_OIDS.indexOf(field.dataTypeID) != -1) {
      type = 'unknown[]';
    } else {
      type = ResultExporter.inferTsType(values) || OID_TS_TYPES[field.dataTypeID] || 'string';
    }

    if (type != 'unknown' && values.some(v => v === null || v === undefined)) {
      type += ' | null';
    }
    return type;
  },

  // Interface property name: quoted when it's not a plain identifier
  interfaceKey (key /*: string */) /*: string */ {
    return IDENTIFIER_REGEX.test(key) ? key : JSON.stringify(key);
  },

  toTypescript (fields /*: ResultExporter_Field[] */, rows /*: any[][] */, moduleSystem /*::? : string */) /*: string */ {
    var keys = ResultExporter.uniqueKeys(fields);
    var objects = ResultExporter.toObjects(fields, rows);

    var props = fields.map((field, i) => {
      var values = objects.map(obj => obj[keys[i]]);
      return `  ${ResultExporter.interfaceKey(keys[i])}: ${ResultExporter.columnTsType(field, values)};`;
    });
    var interfaceBody = props.length ? "{\n" + props.join("\n") + "\n}" : "{}";
    var data = ResultExporter.toJsLiteral(objects);

    if (ResultExporter.normalizeModuleSystem(moduleSystem) == 'commonjs') {
      return `interface Result ${interfaceBody}\n\nconst result: Result[] = ${data};\n\nexport = result;\n`;
    } else {
      return `export interface Result ${interfaceBody}\n\nexport const result: Result[] = ${data};\n`;
    }
  },

  escapeHtml (text /*: string */) /*: string */ {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  htmlCell (val /*: any */) /*: string */ {
    var value = ResultExporter.normalizeValue(val);
    if (value === null) return '<td class="null">NULL</td>';
    if (typeof value == 'number') return `<td class="number">${ResultExporter.escapeHtml(String(value))}</td>`;
    var text = typeof value == 'object' ? JSON.stringify(value) : String(value);
    return `<td>${ResultExporter.escapeHtml(text)}</td>`;
  },

  // Standalone page with a table, column names as is (duplicates allowed in a table)
  toHtml (fields /*: ResultExporter_Field[] */, rows /*: any[][] */) /*: string */ {
    var header = fields.map(f => `<th>${ResultExporter.escapeHtml(f.name)}</th>`).join('');
    var bodyRows = rows.map(row => {
      return '      <tr>' + row.map(val => ResultExporter.htmlCell(val)).join('') + '</tr>';
    });

    return [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <meta charset="utf-8">',
      '  <title>Query Result</title>',
      `  <style>${HTML_STYLE}\n  </style>`,
      '</head>',
      '<body>',
      '  <table>',
      `    <thead><tr>${header}</tr></thead>`,
      '    <tbody>',
      ...bodyRows,
      '    </tbody>',
      '  </table>',
      `  <p>${rows.length} ${rows.length == 1 ? 'row' : 'rows'}</p>`,
      '</body>',
      '</html>',
      ''
    ].join("\n");
  },

  generate (formatId /*: string */, fields /*: ResultExporter_Field[] */, rows /*: any[][] */, options /*::? : {moduleSystem?: string} */) /*: string */ {
    var format = ResultExporter.findFormat(formatId);
    var moduleSystem = options && options.moduleSystem;
    switch (format.id) {
      case 'html':
        return ResultExporter.toHtml(fields, rows);
      case 'typescript':
        return ResultExporter.toTypescript(fields, rows, moduleSystem);
      case 'javascript':
        return ResultExporter.toJavascript(fields, rows, moduleSystem);
      case 'json':
        return ResultExporter.toJson(fields, rows);
      case 'csv':
      default:
        return ResultExporter.toCsv(fields, rows);
    }
  }
};

/*::
declare var ResultExporter__: typeof ResultExporter
*/

module.exports = ResultExporter;
