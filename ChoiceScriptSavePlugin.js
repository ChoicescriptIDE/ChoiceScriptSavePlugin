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
    //initStore().remove(slot);
    var stack = this.tokenizeExpr(line);
    if (stack.length != 1)
        throw new Error("sm_delete: Invalid number of arguments, expected 1.");
    ChoiceScriptSavePlugin._delete(this.evaluateExpr(stack));
}

Scene.prototype.sm_update = function() {
    var self = this;
    var saves = ChoiceScriptSavePlugin._getSaveList();
    self.stats._sm_save_count = saves.length;
    for (var i = 0; i < saves.length; i++) {
        ChoiceScriptSavePlugin._getSaveData(saves[i], function(saveData) {
            if (saveData) {
                self.stats["_sm_save_id_" + i] = saves[i];
                self.stats["_sm_save_name_" + i] = saveData.temps._saveName || "";
                self.stats["_sm_save_date_" + i] = simpleDateTimeFormat(new Date(parseInt(saves[i])));
            }
        });
    }
}

Scene.prototype.sm_menu = function(data) {
    data = data || "";
    data = data.toLowerCase();
    var active = false;
    if (data === "false") {
        active = false;
    } else if (data === "true") {
        active = true;
    } else {
        throw new Error("*sm_menu: expected true or false as an argument!");
    }
    var selectEle = document.getElementById("quickSaveMenu");
    if (selectEle)
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
ChoiceScriptSavePlugin._save = function(dateSlot, saveName) {
    restoreObject(initStore(), "state", null, function(baseSave) {
        if (baseSave) {
            baseSave.temps["_saveName"] = saveName || "";
            saveCookie(function() {}, dateSlot, baseSave.stats, baseSave.temps, baseSave.lineNum, baseSave.indent, this.debugMode, this.nav);
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
        } else {
            /* ChoiceScript hasn't created a save we can use yet.
               This happens when we try to save right after the game
               starts (or a save has just been loaded).
            */
        }
    });
}

ChoiceScriptSavePlugin._load = function(save_id) {
    clearScreen(loadAndRestoreGame.bind(stats.scene, save_id));
}

ChoiceScriptSavePlugin._delete = function(save_id) {
    localStorage.removeItem("PS" + window.storeName.replace("_", "__") + "PSstate" + save_id);
    var select = document.getElementById("quickSaveMenu");
    if (select) {
        var deletedOption = select.options[select.selectedIndex];
        deletedOption.parentElement.removeChild(deletedOption);
    }
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
    var saves = ChoiceScriptSavePlugin._getSaveList();
    for (var i = 0; i < saves.length; i++) {
        var option = document.createElement("option");
        option.setAttribute("value", saves[i] /* time/date */ );
        /* Grab the save data, so we can give it a nice title via _saveName */
        ChoiceScriptSavePlugin._getSaveData(saves[i], function(saveData) {
            if (!saveData) {
                alert("Error: Failed to parse a save. Please report this.");
                option.innerHTML = "Failed to load save.";
                return;
            } else {
                var slotDesc = saveData.stats.sceneName + '.txt (' + simpleDateTimeFormat(new Date(parseInt(saves[i]))) + ')';
                if (saveData.temps._saveName) {
                    slotDesc = saveData.temps._saveName + " &mdash; " + slotDesc;
                }
                option.innerHTML = slotDesc;
            }
        });
        selectEle.appendChild(option);
    }
}

ChoiceScriptSavePlugin._getSaveData = function(slot, callback) {
    restoreObject(initStore(), "state" + slot, null, function(saveData) {
        if (saveData) {
            callback(saveData);
        } else {
            /* Something went wrong. */
            callback(null);
        }
    });
}

/* Pull the list of stored 'saves' from the store by store name */
ChoiceScriptSavePlugin._getSaveList = function() {
    var saveList = [];
    var saveRegExp = new RegExp(window.storeName.replace("_", "__") + "[A-Za-z]*state(\\d+)$");
    for (var key in initStore().store) {
        if (window.store.store.hasOwnProperty(key)) {
            var match;
            if (match = key.match(saveRegExp)) {
                saveList.push(match[1]);
            }
        }
    }
    return saveList.sort(function(a, b) {
        return b - a
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