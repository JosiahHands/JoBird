// Small window opened from the gear in the Query tab's "Save as" menu.
// The choice is saved as soon as it's clicked, so closing the window any way keeps it.

class ExportSettingsDialog extends DialogBase {

  constructor () {
    super(null, {
      dialogClass: 'export-settings-dialog',
      title: 'Export Settings'
    });

    this.showWindow();
  }

  showWindow () {
    this.renderTemplate('dialogs/export_settings', {
      moduleSystem: Model.ExportSettings.moduleSystem(),
      sqlCreateTable: Model.ExportSettings.sqlCreateTable()
    });

    this.content.find('input[name=module_system]').bind('change', (e) => {
      Model.ExportSettings.setModuleSystem(e.target.value);
    });

    this.content.find('input[name=sql_create_table]').bind('change', (e) => {
      Model.ExportSettings.setSqlCreateTable(e.target.checked);
    });

    this.bindFormSubmitting();
  }

  onSubmit () {
    this.close();
  }
}

/*::
declare var ExportSettingsDialog__: typeof ExportSettingsDialog
*/

module.exports = ExportSettingsDialog;
