var openButton, saveButton;
var fileEntry;
var Entryflg;
var hasWriteAccess;

function errorHandler(e) {
  var msg = "";

  switch (e.code) {
  case FileError.QUOTA_EXCEEDED_ERR:
    msg = "QUOTA_EXCEEDED_ERR";
    break;
  case FileError.NOT_FOUND_ERR:
    msg = "NOT_FOUND_ERR";
    break;
  case FileError.SECURITY_ERR:
    msg = "SECURITY_ERR";
    break;
  case FileError.INVALID_MODIFICATION_ERR:
    msg = "INVALID_MODIFICATION_ERR";
    break;
  case FileError.INVALID_STATE_ERR:
    msg = "INVALID_STATE_ERR";
    break;
  default:
    msg = "Unknown Error";
    break;
  };

  console.log("Error: " + msg);
}

function handleDocumentChange(title) {
  if (title) {
    title = title.match(/[^/]+$/)[0];
    document.getElementById("info_title").innerHTML = title;
    document.title = title;
  } else {
    document.getElementById("info_title").innerHTML = Blockly.Msg.INFO_TITLE;
  }
}

function newFile() {
  fileEntry = null;
  hasWriteAccess = false;
  Entryflg = 0;
  handleDocumentChange(null);
}

function setFile(theFileEntry, isWritable) {
  fileEntry = theFileEntry;
  hasWriteAccess = isWritable;
}

function readFileIntoEditor(theFileEntry) {
  var filepath = "";

  //File list in directory
  var reader = theFileEntry.createReader();
  reader.readEntries(function (entries) {
    for (var i = 0; i < entries.length; ++i) {
      if (entries[i].name.indexOf('.xml') != -1) {
        handleDocumentChange(entries[i].name.split('.')[0] + '.ino');
        filepath = entries[i].fullPath;
        writeXmlContent(theFileEntry, filepath);
        return;
      }
    }
  }, errorHandler);
}

function writeXmlContent(theFileEntry, filepath) {
  var xmlTextarea = document.getElementById('content_xml');
  document.getElementById('tab_xml').className = 'tabon';
  document.getElementById('tab_blocks').className = 'taboff';
  document.getElementById('content_xml').style.visibility = 'visible';
  renderContent();

  //open xml file and write xml_textarea
  theFileEntry.getFile(filepath, {}, function (fileEntry) {
    fileEntry.file(function (file) {
      var reader = new FileReader();
      reader.onloadend = function (e) {
        xmlTextarea.value = this.result;
      };
      reader.readAsText(file);
    }, errorHandler);
  }, errorHandler);
}

function writeEditorToFile(theFileEntry, filename, blob) {

  theFileEntry.getFile(filename, {
    create: true
  }, function (entry) {
    entry.createWriter(function (writer) {
      writer.onerror = function (e) {
        console.log("Write failed: " + e.toString());
      }
      writer.truncate(blob.size);
      writer.onwriteend = function () {
        writer.onwriteend = function (e) {
          console.log("Write completed.");
        };
        writer.write(blob);
      }
    }, errorHandler);
  });
}

var onChosenFileToOpen = function (theFileEntry) {
  setFile(theFileEntry, false);
  readFileIntoEditor(theFileEntry);
};

var onWritableFileToOpen = function (theFileEntry) {
  setFile(theFileEntry, true);
  Entryflg = 1;
  readFileIntoEditor(theFileEntry);
};

var onChosenFileToSave = function (theFileEntry) {
  setFile(theFileEntry, true);
  writeEditorToFile(theFileEntry);
};

function handleOpenButton() {
  chrome.fileSystem.chooseEntry({
    type: 'openDirectory'
  }, onWritableFileToOpen);
}

function handleSaveButton() {
  var filename;
  var blob;
  if (fileEntry && hasWriteAccess) {
    if (Entryflg == 1) {
      filename = fileEntry.name + '.ino';
      blob = new Blob([Blockly.Arduino.workspaceToCode()]);
      writeEditorToFile(fileEntry, filename, blob);

      filename = fileEntry.name + '.xml';
      var xmlDom = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
      var xmlText = Blockly.Xml.domToPrettyText(xmlDom);
      blob = new Blob([xmlText]);
      writeEditorToFile(fileEntry, filename, blob);
    } else {
      filename = document.getElementById("info_title").innerHTML
      saveFiles(filename.split('.')[0]);
    }
  } else {
    chrome.fileSystem.chooseEntry({
      type: 'openDirectory'
    }, function (entry) {
      if(entry){
        setFile(entry, true);
        dialog2.showModal();
      }
    });
  }
}

function saveFiles(filename) {
  var blob;
  Entryflg = 2;
  chrome.fileSystem.getWritableEntry(fileEntry, function (entry) {
    entry.getDirectory(filename, {
      create: true
    }, function (dirEntry) {
      var ino_filename = filename + '.ino';
      blob = new Blob([Blockly.Arduino.workspaceToCode()]);
      writeEditorToFile(dirEntry, ino_filename, blob);
      handleDocumentChange(ino_filename);

      var xml_filename = filename + '.xml';
      var xmlDom = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
      var xmlText = Blockly.Xml.domToPrettyText(xmlDom);
      blob = new Blob([xmlText]);
      writeEditorToFile(dirEntry, xml_filename, blob);
    }, errorHandler);
  });

}
