# Olorin Companion App

This companion app, once installed on a computer, will work with a browser plugin to enable automatic printing and, if configured, printer selection based on the notice content. 

The companion app installation files for Windows, Mac, and Linux can be found on the [release page](https://github.com/bywatersolutions/olorin-companion-app/releases)

The plugins for firefox and chrome each have their own repository and the files are on the release pages for those repositories
- [Chrome plugin](https://github.com/bywatersolutions/olorin-browser-plugin-chrome/releases)
- [Firefox plugin](https://github.com/bywatersolutions/olorin-browser-plugin-firefox/releases)

Use the corresponding file for the browser that will be used.

Download and install the Companion app, and download the zip file for desired browser plugin from above, then continue

## Set Up on Computer
For the Companion App, download the file above, unzip, and run from the folder, or add to your programs as usual.  
Once the Olorin Companion file has been added to the computer that will be used, open Olorin Companion, set it to run on log in. 

### Chrome extension
In Chrome, click the settings (three dots), select Extensions->Manage Extensions  
Drag the Olorin-chrome zip you donwloaded to the Chrome Extension page.

### Firefox extension
In Firefox, navigate to the Add-ons Manager
 - through the menu (Tools->Add-ons)
 - by typing about:addons in the address bar).

In the Add-ons Manager, click the gear icon (settings) and select "Install Add-on from file...".  
Finally, browse to the saved file and select it to install the extension

### Continue

Once the extension and Olorin companion app has been installed onto the computer, click the extension (toolbar) that has been installed- you should get a message  
success - connected.

The next step will be to set up the printers that will be used by this computer. Go to the settings with Olorin.

A new browser pane will open and show the types of printing that can be setup:
 - Receipt printer
 - Sticker printer
 - Pager Printer
 - Full Sheet Printer

Click each one of these to the appropriate printer for printing to. 

Save


## Koha Set Up

In the notices, we need to add some text to tell Koha which notice would go to which printer, for example:
 - Issue Slip
 - Issue Quick Slip

Would probably go to the “receipt printer’

To do this, we will add some text at the bottom of each slip that needs to be connected to this printer plugin. 

For example:
```html
<button id= “webPrint” data-printer=“receipt_printer” data-print= ‘#receipt”>Print</button>
```

This code is saying use, web print, use the printer indicated within the quotes after data-printer, and then print all the text within the receipt. You must use the name of the printer from the Olorin settings.

Additionally, some code will be added to the notice to indicate what should print and disregard all the other text that we don’t want to print. 

Add this to the starting point of the actually slip you want to print:
```html
<span id=“receipt”>
```

And then add this to the end of what you are looking to print
```html
</span>
```

Lastly, to have this all go automatically, we will need to add some javascript in the system preference: IntranetSlipPrinterJS:
```javascript
set timeout (function () {$(#webPrint”), trigger (‘click) ; } 1000) ;
```
