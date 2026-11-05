var fs = require('fs');
var electronRemote = require('@electron/remote');
var resultExporter = require('../../../lib/result_exporter');

/*::
interface Query_ExterndedResults extends pg.QueryResult {
  completeRows: any[]
}
*/

class Query extends PaneBase {

  /*::
    button: JQuery<HTMLElement>
    cleanButton: JQuery<HTMLElement>
    saveButton: JQuery<HTMLElement>
    saveSplit: JQuery<HTMLElement>
    saveMenu: JQuery<HTMLElement>
    mime: string
    textarea: JQuery<HTMLElement>
    editor: CodeMirror.EditorFromTextArea
    statusLine: JQuery<HTMLElement>
    saveTimeout: NodeJS.Timer
    lastResult: Query_ExterndedResults
  */

  renderTab () {
    if (this.content) return;

    this.renderViewToPane('query', 'query_tab', {exportFormats: resultExporter.FORMATS});

    this.button = this.content.find('button:first');
    this.cleanButton = this.content.find('button.cleanButton');
    this.saveSplit = this.content.find('.save-split');
    this.saveButton = this.saveSplit.find('button.saveButton');
    this.saveMenu = this.saveSplit.find('.save-menu');
    this.updateSaveFormat();

    // close "Save as" menu when clicking anywhere else or pressing Esc
    document.addEventListener('mousedown', (e) => {
      if (!this.saveSplit[0].contains(/*:: <Node> */ e.target)) this.hideSaveMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key == 'Escape') this.hideSaveMenu();
    });

    this.mime = 'text/x-pgsql';
    this.textarea = this.content.find('textarea.editor');

    var textarea = /*:: <HTMLTextAreaElement><any> */ this.textarea[0];

    this.editor = window.CodeMirror.fromTextArea(textarea, {
      mode: this.mime,
      indentWithTabs: false,
      smartIndent: true,
      lineNumbers: true,
      matchBrackets: true,
      hint: window.CodeMirror.hint.sql,
      autofocus: true,
      styleActiveLine: true,
      tabSize: 2,
      scrollbarStyle: 'null',
      theme: 'mac-classic',
      extraKeys: {"Esc": "autocomplete"}
    });

    if (Model.LastQuery.load()) {
      this.editor.setValue(Model.LastQuery.load());
    }

    this.editor.on("cursorActivity", this.toggleButtonText.bind(this));
    this.editor.on("change", this.saveLastQuery.bind(this));

    this.editor.focus();

    this.setUnchangeable();
    this.statusLine = this.content.find('.result .status');

    new QueryTabResizer(this.content, this.editor);
  }

  saveLastQuery () {
    var value = this.editor.getValue();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      Model.LastQuery.save(value);
      delete this.saveTimeout;
    }, 700);

  }

  toggleButtonText () {
    var runLabel = "Run Query";
    var selectedLabel = "Run Selection";

    var selectedText = this.editor.getSelection();
    if (selectedText && selectedText != "") {
      this.button.text(selectedLabel);
    } else {
      this.button.text(runLabel);
    }
  }

  toggleCleanButton () {
    if (this.content.find('.result table tr').length) {
      this.cleanButton.show();
    } else {
      this.cleanButton.hide();
    }
  }

  toggleSaveButton () {
    if (this.content.find('.result table tr').length) {
      this.saveSplit.show();
    } else {
      this.saveSplit.hide();
      this.hideSaveMenu();
    }
  }

  // Button label and checkmark in menu follow remembered format
  updateSaveFormat () {
    var format = resultExporter.findFormat(Model.ExportSettings.format());
    this.saveButton.text(`Save as ${format.label}`);
    this.saveButton.attr('title', `Save Result as ${format.label} file`);
    this.saveMenu.find('.save-format').forEach(el => {
      $u(el).toggleClass('selected', el.getAttribute('data-format') == format.id);
    });
  }

  toggleSaveMenu () {
    if (this.saveMenu.hasClass('is-hidden')) {
      this.saveMenu.removeClass('is-hidden');
    } else {
      this.hideSaveMenu();
    }
  }

  hideSaveMenu () {
    if (this.saveMenu) this.saveMenu.addClass('is-hidden');
  }

  selectSaveFormat (formatId) {
    Model.ExportSettings.setFormat(formatId);
    this.updateSaveFormat();
    this.hideSaveMenu();
  }

  openExportSettings () {
    this.hideSaveMenu();
    new Dialog.ExportSettings();
  }

  saveSnippet () {
    this.editor.save();
    this.statusLine.text('');

    var selectedText = this.editor.getSelection();

    var sql = selectedText || this.textarea.val();

    new Dialog.NewSnippet(sql)
  }

  runQuery () {
    this.editor.save();
    this.statusLine.text('');

    if (!this.handler.connection.connection) {
      window.alertify.confirm("Not connected to server, reconnect?", (is_yes) => {
        if (is_yes) {
          this.handler.reconnect((success) => {
            if (success) this.runQuery();
          });
        }
      });
      return;
    }

    var selectedText = this.editor.getSelection();

    var sql = selectedText || this.textarea.val().toString();
    var tableRegex = /(create|drop)\s+(OR REPLACE\s+)?((GLOBAL|LOCAL|TEMPORARY|TEMP|UNLOGGED|FOREIGN|MATERIALIZED)\s+)*\s*(table|schema|view)/im;
    var needReloadTables = tableRegex.test(sql);

    this.button.text("Running...");

    App.startLoading("Query still running...", 1000, {
      cancel () {
        App.stopRunningQuery();
      }
    });

    this.handler.connection.queryWithOptions(sql, {rowMode: 'array'}, (data, error) => {
      this.toggleButtonText();
      App.stopLoading();
      if (error) {
        this.cleanResult();
        var message = error.message;
        if (message == "invalid message format") message += ". It can be if too many records, try add 'limit'";
        this.statusLine.text(message);
      } else {
        this.lastResult = data;
        PgTypeNames.extendFields(data);
        if (data.rows) {
          data.completeRows = data.rows.slice();
          if (data.rows.length > 500) {
            data.rows.length = 500;
          }
        }
        var node = App.renderView('db_rows_table', {data: data})[0];
        $u(node).addClass('command_' + data.command);
        this.content.find('.result .rescol-wrapper').replaceWith(node);

        var footerText;
        if (data.fields && !isNaN(data.rowCount) || data.command == "SELECT") {
          footerText = `Found ${data.rowCount} ${data.rowCount > 1 ? 'rows' : 'row'} in ${data.time} ms.`;
          if (data.rowCount > 500) {
            footerText += " Shown first 500 records";
          }
        } else {
          footerText = `Complete, taking ${data.time} ms.`;
          if (data.rowCount) {
            footerText += ` Affected ${data.rowCount} ${data.rowCount > 1 ? 'rows' : 'row'}`;
          }
        }
        this.statusLine.text(footerText);
        this.initTables();
        if (data.command == "EXPLAIN") {
          this.content.find('.result .rescol-wrapper').css('width', '');
        }
      }
      this.toggleCleanButton();
      this.toggleSaveButton();
      if (needReloadTables) {
        this.reloadTables();
      }
      this.editor.focus();
    });
  }

  cleanResult () {
    this.content.find('.result .rescol-wrapper').html("").hide();
    this.statusLine.text("");
    this.lastResult = null;
  }

  cleanButtonClick () {
    this.cleanResult();
    this.toggleCleanButton();
    this.toggleSaveButton();
  }

  reloadTables () {
    this.handler.fetchTablesAndSchemas();
  }

  appendText (sql, lineOffset) {
    if (lineOffset == undefined) lineOffset = 1;

    var lineNo = this.editor.lineCount();
    this.editor.setValue(this.editor.getValue() + sql);
    this.editor.setCursor(lineNo + lineOffset, 0);
    this.editor.focus();
  }

  openSnippets () {
    new SnippetsWindow();
  }

  showHistory () {
    new HistoryWindow();
  }

  async saveQueryResult () {
    this.hideSaveMenu();
    var format = resultExporter.findFormat(Model.ExportSettings.format());
    var dialog = electronRemote.dialog;
    var mainWindow = electronRemote.app.mainWindow;
    var res = await dialog.showSaveDialog(mainWindow, {
      title: `Save result as ${format.label} file`,
      defaultPath: `result.${format.extension}`,
      filters: [
        {name: format.filterName, extensions: [format.extension]},
        {name: 'Other', extensions: ['*']}
      ]
    });
    if (res.filePath) {
      this.saveResultTo(res.filePath, format.id);
    }
  }

  saveResultTo (filename, formatId = 'csv') {
    App.startLoading("Saving file...", 100);

    try {
      var content = resultExporter.generate(formatId, this.lastResult.fields, this.lastResult.completeRows, {
        moduleSystem: Model.ExportSettings.moduleSystem()
      });
      fs.writeFileSync(filename, content, 'utf8');
      console.log('file saved', filename);
    } catch (error) {
      console.error(error);
      $u.alert("Can not save file: " + error.message, {type: "warning"});
    } finally {
      App.stopLoading();
    }
  }

}

/*::
declare var Query__: typeof Query
*/

module.exports = Query;
