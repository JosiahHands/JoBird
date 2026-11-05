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

  it("unknown format and module system fall back to defaults", () => {
    assert.equal(ResultExporter.findFormat('xml').id, 'csv');
    assert.equal(ResultExporter.normalizeModuleSystem('amd'), 'module');
  });

});
