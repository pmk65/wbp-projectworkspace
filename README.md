# webuilder-projectworkspace
Plugin for Blumentals WeBuilder/RapidPHP/RapidCCC/HTMLPad editors

This is a plugin for the following editors:

Webuilder: http://www.webuilderapp.com/<br/>
RapidPHP: http://www.rapidphpeditor.com/<br/>
RapidCSS: https://www.rapidcsseditor.com/<br/>
HTMLPad: https://www.htmlpad.net/


#### Function:
Keeps track of open files for each project. Works with both local and FTP files.

**What the plugin does when you start the editor:**
* Opens all files that was open when you closed the editor.
* Set the active tab to the saved value.

**What the plugin does when you close the editor:**
* Save and close all files currently open.
* Save the active tab.

**What the plugin does when you switch from project A to project B:**
* Save and close all open files in project A.
* Save list of open files in project A. Including: active tab.
* Opens all files that was previously open in project B.
* Restore the active tab to the saved value.

Plugin options are stored together with the normal Projects settings in projects.ini, so it integrates 100% into the original Project functionality. (plugin options are prefixed with the word "Workspace")

Note: Check if you got any other Project related plugins installed, as these might conflict whith the functionality of this plugin.

#### Installation:
1) Download plugin .ZIP file.
2) Open editor and select "Plugins -> Manage Plugins" from the menu.
3) Click "Install" and select the .ZIP file you downloaded in step 1.
