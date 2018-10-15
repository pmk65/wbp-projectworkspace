/**
 * Project Workspace
 *
 * Extends Projects handling with auto save and restore of documents for each project,
 * when changing between projects.
 *
 * @category  WeBuilder Plugin
 * @package   Project Workspace
 * @author    Peter Klein <pmk@io.dk>
 * @copyright 2018
 * @license   http://www.freebsd.org/copyright/license.html  BSD License
 * @version   1.0
 */

/**
 * [CLASS/FUNCTION INDEX of SCRIPT]
 *
 *     73   function ProjectWorkspace()
 *    150   function CloseProjectFiles(exitmode)
 *    199   function GetFileName(doc)
 *    212   function OpenProjectFiles(Sender)
 *    254   function Max(x,y)
 *    268   function Min(x,y)
 *    280   function Nullify(obj)
 *    296   function OnCanResize(Sender, newWidth, newHeight, resize)
 *    309   function OnBeforeSelectProject(Sender)
 *    321   function OnAfterSelectProject(Sender)
 *    330   function OnReady()
 *    340   function OnExit()
 *    353   function OnDisabled()
 *    362   function OnEnabled()
 *    371   function OnInstalled()
 *
 * TOTAL FUNCTIONS: 15
 * (This index is automatically created/updated by the WeBuilder plugin "DocBlock Comments")
 *
 */

/**
 * Global vars
 * Used for GUI restraints
 */
var minWidth, maxWidth;

/**
 * Path to projects.ini file
 * "Abusing" the editor's existing projects.ini file to store plugin data.
 * That way user can rename projects without causing problems for the plugin.
 *
 * @var projectsIniFile
 */
var projectsIniFile = RegexReplace(Script.Path, "plugins(?!.*plugins).*", "settings\\projects.ini", false);

/**
 * Name of previous project when project is switched
 *
 * @var ppName
 */
var ppName = "";

/**
 * Flag for detecting if exit signal is caused by disabling plugin or exiting editor
 *
 * @var pluginAction
 */
var pluginAction = false;

/**
 * Display GUI Modal Window
 *
 * @return void
 */
function ProjectWorkspace() {

    var oMargin = Round(8 * Script.DpiScale); // Outer margin. for TPanels
    var iMargin = Round(8 * Script.DpiScale); // Inner margin. for other VCL components
    var bvPadding = Round(6 * Script.DpiScale); //Vertical button padding;
    var bhPadding = Round(10 * Script.DpiScale); //Horizontal button padding;

    var PSForm = new TForm(WeBuilder);
    PSForm.Caption = "Project Workspace";
    PSForm.ClientHeight = 300;
    PSForm.ClientWidth = 300;
    PSForm.Position = poScreenCenter;
    PSForm.FormStyle = fsStayOnTop;
    PSForm.BorderIcons = biSystemMenu;
    PSForm.Color = clBtnFace;
    PSForm.Font.Color = clWindowText;
    PSForm.Font.Height = WeBuilder.Font.Height;
    PSForm.Font.Name = WeBuilder.Font.Name;

    var tHeight = PSForm.Canvas.TextHeight("Jj");

    var GroupBox1 = new TGroupBox(PSForm);
    GroupBox1.Parent = PSForm;
    GroupBox1.Anchors = akLeft + akTop + akRight + akBottom;
    GroupBox1.Caption = "Workspace enabled for Projects";
    GroupBox1.Left = oMargin;
    GroupBox1.Top = tHeight/2;
    GroupBox1.Width = PSForm.ClientWidth - oMargin - oMargin;
    GroupBox1.Height = PSForm.ClientHeight - GroupBox1.Top - oMargin;

    var CheckListBox1 = new TCheckListBox(PSForm);
    CheckListBox1.Parent = GroupBox1;
    CheckListBox1.Anchors = akLeft + akTop + akRight + akBottom;
    CheckListBox1.ParentFont = false;
    CheckListBox1.Font.Name = WeBuilder.Font.Name;
    CheckListBox1.Font.Height = WeBuilder.Font.Height-1; // Increase font height (uses negative value)
    CheckListBox1.Left = iMargin;
    CheckListBox1.Top = tHeight/2 + iMargin;
    CheckListBox1.Width = GroupBox1.Width - iMargin - iMargin;
    CheckListBox1.Height =  GroupBox1.Height - CheckListBox1.Top - iMargin;
    CheckListBox1.TabOrder = 0;

    // Fill CheckListBox1 with Project names and set checkbox to projects WorkspaceMode setting
    var projectsIni = new TIniFile(projectsIniFile);
    projectsIni.ReadSections(CheckListBox1.Items);
    for (var i=0;i<CheckListBox1.Items.Count;i++) {
        CheckListBox1.Checked[i] = projectsIni.ReadBool(CheckListBox1.Items[i], "WorkspaceMode", StrToBool(Script.ReadSetting("WorkspaceMode", "0")));
    }
    delete projectsIni;
    CheckListBox1.ItemIndex = CheckListBox1.Items.IndexOf(Script.ProjectSettings.SelectedProjectName);

    minWidth = GroupBox1.Width + GroupBox1.Left + oMargin + oMargin + iMargin;
    minHeight = GroupBox3.Top + ListBox2.Top + iMargin + tHeight*5;

    PSForm.OnCanResize = "OnCanResize";

    PSForm.ShowModal;

    // Write mode settings back to each project
    projectsIni = new TIniFile(projectsIniFile);
    for (var j=0;j<CheckListBox1.Items.Count;j++) {
        projectsIni.WriteBool(CheckListBox1.Items[j], "WorkspaceMode", CheckListBox1.Checked(j));
    }
    delete projectsIni;

    // Cleanup
    PSForm = Nullify(PSForm);

}

/**
 * Close all open files from previous project
 *
 * @param  boolean   exitmode
 *
 * @return void
 */
function CloseProjectFiles(exitmode) {

    if ((ppName == Script.ProjectSettings.SelectedProjectName) && (exitmode == false)) return;   // Same project as before

    if (ppName =="") return;

    var projectsIni = new TIniFile(projectsIniFile);

    if (projectsIni.ReadBool(ppName, "WorkspaceMode", StrToBool(Script.ReadSetting("WorkspaceMode", "0"))) == true) {

        var OL = new TStringList; // Openfiles list in order
        var selectedDocument = Document.FileName;

        for (var i=Documents.Count-1; i>=0; i--) {
            var doc = Documents.Tab[i];

            var fname = GetFileName(doc);

            if (doc.Editor.Modified == true) {
                doc.Save(fname);
                if (fname == "") fname = GetFileName(doc); // Re-get name if new unsaved document
            }

            if (fname != "") {
                OL.Add(fname);
                doc.Close(true);
            }
        }

        projectsIni.WriteString(ppName, "WorkspaceOpenFiles", "{" + OL.CommaText + "}");
        projectsIni.WriteString(ppName, "WorkspaceSelectedDocument", selectedDocument);

        delete OL;
    }

    delete projectsIni;

    // The opening of files can't be done directly, but has to be in a TimeOut function to work
    if (!exitMode) Script.Timeout(10, "OpenProjectFiles");

}

/**
 * Get document filename (local or FTP)
 *
 * @param  object   doc The Document object
 *
 * @return string
 */
function GetFileName(doc) {
    var fname = doc.FileName;
    if (fname == "") fname = doc.FtpFileName;
    return fname;
}

/**
 * Open all files for current project
 *
 * @param  object   Sender
 *
 * @return void
 */
function OpenProjectFiles(Sender) {
    var spName = Script.ProjectSettings.SelectedProjectName;
    var projectsIni = new TIniFile(projectsIniFile);

    if (projectsIni.ReadBool(spName, "WorkspaceMode", StrToBool(Script.ReadSetting("WorkspaceMode", "0"))) == true) {

        var curFiles = RegexReplace(projectsIni.ReadString(spName, "WorkspaceOpenFiles", ""), "^{(.*)}$", "$1", false);

        if (curFiles != "") {

            var OL = new TStringList; // Openfiles list in order
            OL.CommaText = curFiles;

            var selecteDocument = projectsIni.ReadString(spName, "WorkspaceSelectedDocument", "");

            for (var i=OL.Count-1;i >= 0;i--) {
                if ((FileExists(OL[i])) || (RegexMatch(OL[i], "^ftp::", true) != "")) {
                    Documents.OpenDocument(OL[i]); // Open document from list
                }
            }

            if (selecteDocument != "") {
                Documents.TabByFileName(selecteDocument).Activate;
            }

            delete OL;
        }
    }

    delete projectsIni;

}

/**
 *
 * Returns the largest of two numbers.
 *
 * @param     number  x: The 1st value
 * @param     number  y: The 2nd value
 * @return    number
 *
 */
function Max(x,y) {
    if (x > y) return x;
    return y;
}

/**
 *
 * Returns the smallest two numbers.
 *
 * @param     number  x: The 1st value
 * @param     number  y: The 2nd value
 * @return    number
 *
 */
function Min(x,y) {
    if (x < y) return x;
    return y;
}

/**
 * Remove object and resets it value to null
 *
 * @param  object   obj
 *
 * @return null
 */
function Nullify(obj) {
    if (obj != null) delete obj;
    return null;
}

/**
 * OnCanResize callback function for TForm
 * Connstrains the resizing of modal window
 *
 * @param  object   Sender TForm object
 * @param  int      NewWidth
 * @param  int      NewHeight
 * @param  boolean  Resize set to false to prevent resizing
 *
 * @return void
 */
function OnCanResize(Sender, newWidth, newHeight, resize) {
    newWidth = max(min(newWidth, 500), minWidth);
    newHeight = max(min(newHeight, 500), minHeight);
}

/**
 * project_before_select callback function.
 * Fired after a new project have been selected, but before old project is unloaded.
 *
 * @param  object   Sender
 *
 * @return void
 */
function OnBeforeSelectProject(Sender) {
    ppName = Script.ProjectSettings.SelectedProjectName; // Save name of previous project
}

/**
 * project_after_select callback function.
 * Fired after a new project have been selected, after old project have been unloaded.
 *
 * @param  object   Sender
 *
 * @return void
 */
function OnAfterSelectProject(Sender) {
    CloseProjectFiles(false);
}

/**
 * Signal triggered when plugin/editor is loaded
 *
 * @return void
 */
function OnReady() {
    if (pluginAction) pluginAction = false;
    else OpenProjectFiles(Document); // Load files for current project at editor start
}

/**
 * Signal triggered when exiting plugin/editor
 *
 * @return void
 */
function OnExit() {
    if (pluginAction) pluginAction = false;
    else {
        ppName = Script.ProjectSettings.SelectedProjectName;
        CloseProjectFiles(true);
    }
}

/**
 * Signal triggered when plugin is disabled through Plugin Manager.
 *
 * @return void
 */
function OnDisabled() {
    pluginAction = true;
}

/**
 * Signal triggered when plugin is enabled through Plugin Manager.
 *
 * @return void
 */
function OnEnabled() {
    pluginAction = true;
}

/**
 * Signal triggered when plugin is installed through Plugin Manager.
 *
 * @return void
 */
function OnInstalled() {
    Alert("Project Workspace 1.0 by Peter Klein installed sucessfully!");
}

// Signals for plugin setup
Script.ConnectSignal("installed", "OnInstalled");

// Signals to detect change of Project etc.
Script.ConnectSignal("project_after_select", "OnAfterSelectProject");
Script.ConnectSignal("project_before_select", "OnBeforeSelectProject");
Script.ConnectSignal("ready", "OnReady");
Script.ConnectSignal("exit", "OnExit");
Script.ConnectSignal("disabled", "OnDisabled");
Script.ConnectSignal("enabled", "OnEnabled");

// Action for displaying GUI
var bmp = new TBitmap, act;
LoadFileToBitmap(Script.Path + "project-workspace-icon.png", bmp);
act = Script.RegisterAction("", "Project Workspace", "", "ProjectWorkspace");
Actions.SetIcon(act, bmp);
delete bmp;
