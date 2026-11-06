// Remembers "Save as ..." choices in the Query tab between app launches.
// Valid formats and module systems come from lib/result_exporter.js

class ExportSettings {

  static exporter () {
    return require('../../lib/result_exporter');
  }

  // "csv", "json", "typescript", "javascript", "html" or "sql"; csv when nothing saved yet
  static format () /*: string */ {
    return ExportSettings.exporter().findFormat(ExportSettings.read('exportFormat')).id;
  }

  static setFormat (value /*: string */) {
    if (ExportSettings.exporter().FORMATS.some(f => f.id == value)) {
      ExportSettings.write('exportFormat', value);
    }
  }

  // "module" (export const ...) or "commonjs" (module.exports / export =), for JS and TS
  static moduleSystem () /*: string */ {
    return ExportSettings.exporter().normalizeModuleSystem(ExportSettings.read('exportModuleSystem'));
  }

  static setModuleSystem (value /*: string */) {
    if (ExportSettings.exporter().normalizeModuleSystem(value) == value) {
      ExportSettings.write('exportModuleSystem', value);
    }
  }

  // "Save as SQL": write CREATE TABLE before the INSERTs (default on)
  static sqlCreateTable () /*: boolean */ {
    return ExportSettings.read('exportSqlCreateTable') != 'false';
  }

  static setSqlCreateTable (value /*: boolean */) {
    ExportSettings.write('exportSqlCreateTable', value ? 'true' : 'false');
  }

  static read (key /*: string */) /*: string */ {
    try {
      return window.localStorage[key];
    } catch (error) {
      return undefined;
    }
  }

  static write (key /*: string */, value /*: string */) {
    try {
      window.localStorage[key] = value;
    } catch (error) {
      console.error("Can not save export setting", error);
    }
  }
}

/*::
declare var ExportSettings__: typeof ExportSettings
*/

module.exports = ExportSettings;
