/* ----- New ChoiceScript Commands ----- */
Scene.prototype.sm_save = function(line) {
    var stack = this.tokenizeExpr(line);
    if (stack.length > 2)
        throw new Error("sm_save: Invalid number of arguments, expected 0, 1 (save name) or 2 (id).");
    ChoiceScriptSavePlugin._save(new Date().getTime(), stack.length == 1 ? this.evaluateExpr(stack) : null);
}

Scene.prototype.sm_load = function(line) {
    var stack = this.tokenizeExpr(line);
    var variable = this.evaluateExpr(stack);
    //if (stack.length === 0)
    this.finished = true;
    this.skipFooter = true;
    this.screenEmpty = true;
    ChoiceScriptSavePlugin._load(variable);
}

Scene.prototype.sm_delete = function(line) {
    var stack = this.tokenizeExpr(line);
    if (stack.length != 1)
        throw new Error("sm_delete: Invalid number of arguments, expected 1.");
    ChoiceScriptSavePlugin._delete(this.evaluateExpr(stack));
}

Scene.prototype.sm_update = function() {
    if (typeof this.stats._sm_save_count === "undefined")
        this.stats._sm_save_count = 0;
    ChoiceScriptSavePlugin._getSaveList(function(saveList) {
        if (!saveList)
            return;
        ChoiceScriptSavePlugin._syncHelperVariables(saveList, function() {});
    });
}

Scene.prototype.sm_menu = function(data) {
    data = data || "";
    data = data.toLowerCase();
    var selectEle = document.getElementById("quickSaveMenu");
    if (!selectEle)
        return;
    var active = false;
    if (data === "false") {
        active = false;
    } else if (data === "true") {
        active = true;
    } else if (!data) { // toggle
        active = selectEle.style.display == "none";
    } else {
        throw new Error("*sm_menu: expected true, false (or nothing) as an argument!");
    }
    selectEle.style.display = active ? "inline" : "none";
    var btns = document.getElementsByClassName("savePluginBtn");
    for (var i = 0; i < btns.length; i++) {
        btns[i].style.display = active ? "inline" : "none";
    }
}

Scene.validCommands["sm_save"] = 1;
Scene.validCommands["sm_load"] = 1;
Scene.validCommands["sm_delete"] = 1;
Scene.validCommands["sm_update"] = 1;
Scene.validCommands["sm_menu"] = 1;

/* ----- FrameWork Functionality (Internal) ----- */

var ChoiceScriptSavePlugin = {}

ChoiceScriptSavePlugin._CSS =
    "#quickSaveMenu {\
        margin: 5px;\
        width: 100px;\
    }";

/* Saving once a page has finished loading causes a lot of problems.
   However, ChoiceScript already stores a working save at the top of every page,
   so we can just copy that save over to the specified slot. */
ChoiceScriptSavePlugin._save = function(saveId, saveName) {
    restoreObject(initStore(), "state", null, function(baseSave) {
        if (baseSave) {
            baseSave.stats["_smSaveName"] = saveName || "";
            baseSave.stats["_smSaveDateId"] = saveId;
            ChoiceScriptSavePlugin._addToSaveList(saveId, function(success) {
                if (!success)
                    return;
                saveCookie(function() {}, ChoiceScriptSavePlugin._formatSlotName(saveId), baseSave.stats, baseSave.temps, baseSave.lineNum, baseSave.indent, this.debugMode, this.nav);
                /* Attempt to re-populate the quick save menu.
                This might not actually exist when an sm_save is run,
                so we have to wait a few seconds. If it still doesn't exist
                it's not the end of the world, but the save won't appear until
                the next refresh. */
                setTimeout(function() {
                    var selectEle = document.getElementById("quickSaveMenu");
                    if (selectEle) {
                        selectEle.innerHTML = "";
                        ChoiceScriptSavePlugin._populateSaveMenu(selectEle);
                    }
                }, 3000);
            });
        } else {
            /* ChoiceScript hasn't created a save we can use yet.
               This happens when we try to save right after the game
               starts (or a save has just been loaded).
            */
        }
    });
}

/* Utility function to grab a slots (near) full name:
     Save data is stored in the form:
        'state' + STORE_NAME + '_SAVE_' + dateId
    Where 'state' is something ChoiceScript uses internally,
    STORE_NAME is provided in the game's index.html,
    and dateId is the unique handle/key stored in the save list.

    Note that 'state' is not included here, as we use some internal
    CS functions that already add it. Instead we hard-code it in the
    few places we rely directly on the persist.js API.
*/
ChoiceScriptSavePlugin._formatSlotName = function(saveId){
    return (window.storeName + '_SAVE_' + saveId);
}

ChoiceScriptSavePlugin._load = function(saveId) {
    clearScreen(loadAndRestoreGame.bind(stats.scene, ChoiceScriptSavePlugin._formatSlotName(saveId)));
}

ChoiceScriptSavePlugin._delete = function(saveId) {
    ChoiceScriptSavePlugin._removeFromSaveList(saveId, function(success) {
        if (!success)
            return;
        var select = document.getElementById("quickSaveMenu");
        if (select) {
            var deletedOption = select.options[select.selectedIndex];
            if (deletedOption)
                deletedOption.parentElement.removeChild(deletedOption);
        }
        initStore().remove("state" + ChoiceScriptSavePlugin._formatSlotName(saveId), function(success, val) {
            // Likely there's nothing to delete
        });
    });
}

ChoiceScriptSavePlugin._createQuickSaveMenu = function() {

    var p = document.getElementById("restartButton").parentElement;
    if (!p) {
        alert("Error: unable to attach quick save menu");
        return;
    }

    // CSS
    var head = document.getElementsByTagName("head")[0];
    var style = document.createElement("style");
    style.innerHTML = ChoiceScriptSavePlugin._CSS;
    head.appendChild(style);

    // HTML
    var selectEle = document.createElement("select");
    selectEle.setAttribute("id", "quickSaveMenu");

    p.appendChild(selectEle);

    var buttonArr = [{
            "innerHTML": "New Save",
            "clickFunc": "ChoiceScriptSavePlugin.save();"
        },
        {
            "innerHTML": "Load",
            "clickFunc": "ChoiceScriptSavePlugin.load();"
        },
        {
            "innerHTML": "Delete",
            "clickFunc": "ChoiceScriptSavePlugin.delete();"
        }
    ];

    for (var i = 0; i < buttonArr.length; i++) {
        var btn = document.createElement("button");
        btn.innerHTML = buttonArr[i].innerHTML;
        btn.setAttribute("class", "spacedLink savePluginBtn");
        btn.setAttribute("onclick", buttonArr[i].clickFunc);
        p.appendChild(btn);
    }

    return selectEle;
}

/* Add the 'option' elements to the given selection input */
ChoiceScriptSavePlugin._populateSaveMenu = function(selectEle) {
    ChoiceScriptSavePlugin._getSaveList(function(saveList) {
        if (!saveList)
            return;
        saveList.forEach(function(saveId) {
            /* Grab the save data, so we can give it a nice title via _saveName */
            ChoiceScriptSavePlugin._getSaveData(saveId, function(saveData) {
                if (!saveData) {
                    return;
                }
                var option = document.createElement("option");
                option.setAttribute("value", saveData.stats._smSaveDateId /* time/date */ );
                if (!saveData) {
                    option.innerHTML = "Failed to load save.";
                } else {
                    var slotDesc = saveData.stats.sceneName + '.txt (' + simpleDateTimeFormat(new Date(parseInt(saveData.stats._smSaveDateId))) + ')';
                    if (saveData.stats._smSaveName) {
                        slotDesc = saveData.stats._smSaveName + " &mdash; " + slotDesc;
                    }
                    option.innerHTML = slotDesc;
                }
                selectEle.appendChild(option);
            });
        });
    });
}

ChoiceScriptSavePlugin._getSaveData = function(saveId, callback) {
    restoreObject(initStore(), "state" + ChoiceScriptSavePlugin._formatSlotName(saveId), null, function(saveData) {
        if (saveData) {
            callback(saveData);
        } else {
            /* Something went wrong. */
            callback(null);
        }
    });
}

/* The save list is a space separated string of date identifiers, e.g.
        "1581976656199 1581976297095 1581976660752"
    We use this to keep a record of stored save keys/handles.
*/
ChoiceScriptSavePlugin._removeFromSaveList = function(saveId, callback) {
    ChoiceScriptSavePlugin._getSaveList(function(saveList) {
        if (!saveList)
            return;
        var index = saveList.indexOf(saveId.toString());
        if (index > -1)
            saveList.splice(index, 1);
        initStore().set("save_list", saveList.join(" "), function(success, val) {
            ChoiceScriptSavePlugin._syncHelperVariables(saveList, function() {
                callback(success);
            })
        });
    });
}

ChoiceScriptSavePlugin._addToSaveList = function(saveId, callback) {
    ChoiceScriptSavePlugin._getSaveList(function(saveList) {
        if (!saveList)
            return;
        saveList.push(saveId.toString());
        initStore().set("save_list", saveList.join(" "), function(success, val) {
            ChoiceScriptSavePlugin._syncHelperVariables(saveList, function() {
                callback(success);
            })
        });
    });
}

ChoiceScriptSavePlugin._syncHelperVariables = function(saveList, callback) {
    self.stats._sm_save_count = saveList.length;
    saveList.forEach(function(save, index) {
        ChoiceScriptSavePlugin._getSaveData(save, function(saveData) {
            if (saveData) {
                self.stats["_sm_save_id_" + index] = save;
                self.stats["_sm_save_name_" + index] = saveData.stats._smSaveName || "";
                self.stats["_sm_save_date_" + index] = simpleDateTimeFormat(new Date(parseInt(save)));
            }
        });
    });
    callback();
}

/* Pull the list of stored 'saves' from the store by store name */
ChoiceScriptSavePlugin._getSaveList = function(callback) {
    initStore().get("save_list", function(success, val) {
        if (!success)
            callback(null);
        if (!val)
            callback([]);
        else
            callback(saveList = val.split(" ").sort(function(a, b) {
                return b - a;
            }));
    });
}

ChoiceScriptSavePlugin._init = function() {
    // don't initialize until files have been uploaded (CS commit: 8092aedf17505bd5f9b46c76acf082b89d494a03)
    if (("file:" === window.location.protocol) && (!window.uploadedFiles)) {
        setTimeout(ChoiceScriptSavePlugin._init, 3000);
        return;
    }
    if (!window.storeName) {
        // disallow sm_ commands as they depend on a store
        Scene.validCommands["sm_save"] = 0;
        Scene.validCommands["sm_load"] = 0;
        Scene.validCommands["sm_delete"] = 0;
        Scene.validCommands["sm_menu"] = 0;
        Scene.validCommands["sm_menu"] = 0;
        return alertify.error("Disabling ChoiceScript Save Plugin as there is no storeName detected. Please check your index.html.");
    }
    ChoiceScriptSavePlugin._populateSaveMenu(ChoiceScriptSavePlugin._createQuickSaveMenu());
}

/* ----- FrameWork Functionality (External) ----- */

ChoiceScriptSavePlugin.save = function() {
    if (stats.sceneName == "choicescript_stats") {
        alert("Error: Unable to save at this point.");
        return;
    }
    var date = new Date();
    var message = "What would you like to call this save?<br>Leaving this blank will result in a scene and date identifier.";

    alertify.prompt(message, function(e, saveName) {
        if (e) {
            ChoiceScriptSavePlugin._save(date.getTime(), saveName);
        } else {
            // user cancelled
        }
    }, "Quick Save" /* default value */ );
}

ChoiceScriptSavePlugin.delete = function() {
    var select = document.getElementById("quickSaveMenu");
    if (select.value <= 0)
        return;
    var message = "Delete save '" + select.options[select.selectedIndex].text + '\'?<br>This cannot be undone!';
    alertify.confirm(message, function(result) {
        if (!result) {
            return;
        } else {
            ChoiceScriptSavePlugin._delete(parseInt(select.value));
        }
    });
}

ChoiceScriptSavePlugin.load = function() {
    var select = document.getElementById("quickSaveMenu");
    if (select.value <= 0)
        return;
    alertify.confirm("Are you sure you wish to load this save?<br>Current progress will be lost!", function(result) {
        if (!result) {
            return;
        } else {
            ChoiceScriptSavePlugin._load(select.value);
        }
    });
}

// initialize after a small delay, so everything else can catch up.
setTimeout(ChoiceScriptSavePlugin._init, 3000);