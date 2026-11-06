// Doesn't need a database, can also run with: npx mocha tests/result_exporter_test.js
var assert = require('assert');
var vm = require('vm');
var ResultExporter = require('../lib/result_exporter');

var fields = [
  {name: 'id', dataTypeID: 23},
  {name: 'name', dataTypeID: 25},
  {name: 'active', dataTypeID: 16},
  {name: 'created', dataTypeID: 1184},
  {name: 'id', dataTypeID: 23},
  {name: 'first name', dataTypeID: 25},
  {name: 'tags', dataTypeID: 1009},
  {name: 'meta', dataTypeID: 3802},
  {name: 'ratio', dataTypeID: 701},
];

var rows = [
  [1, 'Bird "One"', true, new Date('2020-01-02T03:04:05Z'), 10, 'Ann', ['a', 'b'], {x: 1}, 0.5],
  [2, null, false, null, 20, 'Bob', [], null, NaN],
];

var evalCommonJs = (code) => {
  var module = {exports: {}};
  vm.runInNewContext(code, {module: module, exports: module.exports});
  return module.exports;
};

describe('ResultExporter', () => {

  it("csv keeps original format", () => {
    var csv = ResultExporter.generate('csv', fields.slice(0, 4), rows.map(r => r.slice(0, 4)));
    assert.equal(csv,
      'id,name,active,created\n' +
      '1,"Bird ""One""",1,2020-01-02T03:04:05.000Z\n' +
      '2,,,\n'
    );
  });

  it("json is array of objects with unique keys", () => {
    var data = JSON.parse(ResultExporter.generate('json', fields, rows));
    assert.deepEqual(Object.keys(data[0]), ['id', 'name', 'active', 'created', 'id_2', 'first name', 'tags', 'meta', 'ratio']);
    assert.deepEqual(data[0], {
      id: 1, name: 'Bird "One"', active: true, created: '2020-01-02T03:04:05.000Z',
      id_2: 10, 'first name': 'Ann', tags: ['a', 'b'], meta: {x: 1}, ratio: 0.5
    });
    assert.equal(data[1].name, null);
    assert.equal(data[1].ratio, null); // NaN is not valid JSON
  });

  it("converts bytea to hex and keeps __proto__ column", () => {
    var data = JSON.parse(ResultExporter.generate('json',
      [{name: 'bin', dataTypeID: 17}, {name: '__proto__', dataTypeID: 23}],
      [[Buffer.from([0xde, 0xad]), 5]]
    ));
    assert.equal(data[0].bin, '\\xdead');
    assert.equal(Object.getOwnPropertyDescriptor(data[0], '__proto__').value, 5);
  });

  it("javascript module export", () => {
    var code = ResultExporter.generate('javascript', fields, rows, {moduleSystem: 'module'});
    assert(code.startsWith('export const result = [\n  {\n    id: 1,\n'), code);
    assert(code.includes('"first name": "Ann"'));
    assert(code.includes('ratio: NaN'));
    var data = evalCommonJs(code.replace('export const result =', 'module.exports.result ='));
    assert.equal(data.result.length, 2);
    assert.equal(data.result[0].id_2, 10);
  });

  it("javascript commonjs export", () => {
    var code = ResultExporter.generate('javascript', fields, rows, {moduleSystem: 'commonjs'});
    assert(code.startsWith('const result = ['));
    assert(code.endsWith('\n\nmodule.exports = { result };\n'));
    var data = evalCommonJs(code);
    assert.equal(data.result[1].name, null);
    assert(Number.isNaN(data.result[1].ratio));
  });

  it("javascript keeps __proto__ as own key", () => {
    var code = ResultExporter.generate('javascript', [{name: '__proto__', dataTypeID: 23}], [[5]], {moduleSystem: 'commonjs'});
    assert(code.includes('["__proto__"]: 5'));
    var data = evalCommonJs(code);
    assert.equal(Object.getOwnPropertyDescriptor(data.result[0], '__proto__').value, 5);
  });

  it("typescript interface types", () => {
    var code = ResultExporter.generate('typescript', fields, rows, {moduleSystem: 'module'});
    assert(code.startsWith(
      'export interface Result {\n' +
      '  id: number;\n' +
      '  name: string | null;\n' +
      '  active: boolean;\n' +
      '  created: string | null;\n' +
      '  id_2: number;\n' +
      '  "first name": string;\n' +
      '  tags: string[];\n' +
      '  meta: unknown;\n' +
      '  ratio: number;\n' +
      '}\n\n' +
      'export const result: Result[] = [\n'
    ), code);
  });

  it("typescript commonjs export", () => {
    var code = ResultExporter.generate('typescript', fields, rows, {moduleSystem: 'commonjs'});
    assert(code.startsWith('interface Result {\n'));
    assert(code.includes('\n\nconst result: Result[] = ['));
    assert(code.endsWith('\n\nexport = result;\n'));
  });

  it("typescript types for empty and all-null columns", () => {
    var code = ResultExporter.generate('typescript',
      [{name: 'n', dataTypeID: 23}, {name: 'big', dataTypeID: 20}, {name: 'arr', dataTypeID: 1007}],
      [[null, null, [1, null]]]
    );
    assert(code.includes('  n: number | null;\n'));
    assert(code.includes('  big: string | null;\n'));
    assert(code.includes('  arr: (number | null)[];\n'));

    var empty = ResultExporter.generate('typescript', [{name: 'id', dataTypeID: 23}], []);
    assert.equal(empty, 'export interface Result {\n  id: number;\n}\n\nexport const result: Result[] = [];\n');
  });

  it("html table with escaped values", () => {
    var html = ResultExporter.generate('html',
      [{name: 'id', dataTypeID: 23}, {name: '<b>', dataTypeID: 25}, {name: 'meta', dataTypeID: 3802}],
      [[1, '<script>alert("x")</script> & co', {a: '<i>'}], [2, null, null]]
    );
    assert(html.startsWith('<!DOCTYPE html>\n'));
    assert(html.includes('<thead><tr><th>id</th><th>&lt;b&gt;</th><th>meta</th></tr></thead>'));
    assert(html.includes('<tr><td class="number">1</td><td>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</td><td>{&quot;a&quot;:&quot;&lt;i&gt;&quot;}</td></tr>'));
    assert(html.includes('<tr><td class="number">2</td><td class="null">NULL</td><td class="null">NULL</td></tr>'));
    assert(!html.includes('<script>'));
    assert(html.includes('<p>2 rows</p>'));

    var empty = ResultExporter.generate('html', [{name: 'id', dataTypeID: 23}], []);
    assert(empty.includes('    <tbody>\n    </tbody>'));
  });

  it("sql uses real table, column names and types", () => {
    var sql = ResultExporter.generate('sql',
      [{name: 'first', dataTypeID: 1043}, {name: 'hr', dataTypeID: 23}],
      [["O'Neil", 30], [null, 2]],
      {sql: {
        table: {schema: 'public', name: 'people'},
        columns: [{name: 'namefirst', type: 'character varying(255)'}, {name: 'hr', type: 'integer'}]
      }}
    );
    assert.equal(sql,
      '-- Exported from JoBird: 2 rows\n' +
      'BEGIN;\n\n' +
      'CREATE TABLE people (\n' +
      '  namefirst character varying(255),\n' +
      '  hr integer\n' +
      ');\n\n' +
      "INSERT INTO people (namefirst, hr) VALUES ('O''Neil', 30);\n" +
      'INSERT INTO people (namefirst, hr) VALUES (NULL, 2);\n\n' +
      'COMMIT;\n'
    );
  });

  it("sql without CREATE TABLE, other schema, quoted names", () => {
    var sql = ResultExporter.generate('sql',
      [{name: 'User', dataTypeID: 25}, {name: 'order', dataTypeID: 23}],
      [['a', 1]],
      {sql: {table: {schema: 'Stats', name: 'my table'}, columns: [], createTable: false}}
    );
    assert(!sql.includes('CREATE TABLE'));
    assert(sql.includes('INSERT INTO "Stats"."my table" ("User", "order") VALUES (\'a\', 1);'), sql);
  });

  it("sql falls back to result table with unique columns", () => {
    var sql = ResultExporter.generate('sql', [{name: 'id', dataTypeID: 23}, {name: 'id', dataTypeID: 20}], [[1, '2']]);
    assert(sql.includes('CREATE TABLE result (\n  id integer,\n  id_2 bigint\n);'), sql);
    assert(sql.includes("INSERT INTO result (id, id_2) VALUES (1, '2');"), sql);
  });

  it("sql value literals", () => {
    var lit = ResultExporter.sqlLiteral;
    var ts = new Date(2020, 1, 3, 4, 5, 6, 7);
    var tsMoment = {origValueString: '2020-02-03 04:05:06.123456+03', toISOString: () => 'x'};
    assert.equal(lit(null, 23), 'NULL');
    assert.equal(lit(true, 16), 'TRUE');
    assert.equal(lit(NaN, 701), "'NaN'");
    assert.equal(lit(-Infinity, 701), "'-Infinity'");
    assert.equal(lit(1.5, 701), '1.5');
    assert.equal(lit(Buffer.from([0xde, 0xad]), 17), "'\\xdead'");
    assert.equal(lit(new Date(2020, 1, 3), 1082), "'2020-02-03'");
    assert.equal(lit(ts, 1114), "'2020-02-03 04:05:06.007'");
    assert.equal(lit(tsMoment, 1184), "'2020-02-03 04:05:06.123456+03'");
    assert.equal(lit({toPostgres: () => '1 day'}, 1186), "'1 day'");
    assert.equal(lit({x: 1, y: 2}, 600), "'(1,2)'");
    assert.equal(lit({a: [1, "it's"]}, 3802), `'{"a":[1,"it''s"]}'`);
    assert.equal(lit([1, null, 3], 1007), `'{"1",NULL,"3"}'`);
    assert.equal(lit([['a"b', 'c\\d'], []], 1009), `'{{"a\\"b","c\\\\d"},{}}'`);
    assert.equal(lit([{a: 1}, null], 3807), `'{"{\\"a\\":1}",NULL}'`);
  });

  it("unknown format and module system fall back to defaults", () => {
    assert.equal(ResultExporter.findFormat('xml').id, 'csv');
    assert.equal(ResultExporter.normalizeModuleSystem('amd'), 'module');
  });

});
