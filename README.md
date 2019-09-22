# The ChoiceScript Save Plugin
Is a small addon script for ChoiceScript to allow control over persistent (hard) saves.

![Example gif of plugin behaviour](../assets/images/docs_loading.gif?raw=true)

It provides both a Visual Novel-esque quick save menu, and some additional ChoiceScript commands, in order to give you the greatest flexibility over how and where you game can be saved.

## Installation

As the ChoiceScript save plugin is an unofficial 'addon' for ChoiceScript, there are a few technical steps required to get it up and running.

First and foremost, you'll need to download the latest copy of the JavaScript file <a href="https://gist.githubusercontent.com/CareyJWilliams/b11b15f8636475023d78a7d9a16dea92/raw/f40b3ef996a422f378a6ed82a3cf9681aa48f204/ChoiceScriptSavePlugin.js" download>here</a>. Next, you'll need to add that file to your game's 'web' folder, next to the other script files, as shown below.

![Adding the script to the web folder](../assets/images/docs_web_folder.jpg?raw=true)

Now you'll need to make two small edits to your game's index.html file (the one in the 'mygame' folder, not the one located in the 'web' folder).

The first edit is to include the script you just downloaded, so that the game knows where to find it.
If you've got the previous steps correct and have the right index.html file, this should be a simple copy and paste of the following line:  ```<script src="../ChoiceScriptSavePlugin.js"></script>```. The positioning is important, so make sure to place it between navigator.js and mygame.js, as shown below. 

![Including the script](../assets/images/docs_include_script.jpg?raw=true)

Last, but not least, you'll need to provide a unique name to identify your game and its saves, as shown below. Note that this should be something that is unlikely to change or clash with another game's. "MY_GAME" is a bad example, as is "MY_WIP".

![Changing the store name](../assets/images/docs_store_name.jpg?raw=true)

 Also note that if you ever wish to disable the 'persistent session' behaviour in ChoiceScript, you can set this back to ```window.storeName = null;```, though this will also disable the saving mod. 

## Usage Notes

Unlike the previous save plugins (save.js, smPlugin.js and smPluginMenuAddon.js) this plugin leverages heavily on save behaviour that is already present within the ChoiceScript interpreter. Whilst this greatly simplifies and improves the stability of the plugin, it does come with a few caveats. Most notably is the requirement to enable the 'persistent storage' behaviour of ChoiceScript games. This is where the game will 'remember' where you left off, should you leave and return to the page. Much the same as the games published on the choiceofgames.com site. Whilst helpful when playing, this behaviour can prove rather detrimental during development. It is suggested that you disable this when developing your game, via setting ```window.storeName``` back to ```null```.

Though both built upon the system mentioned above, the ChoiceScript save plugin provides two different interfaces for handling saving and loading in your ChoiceScript game.

### Quick Save Menu
The recommended way to use the plugin is via 'quick save menu' and its associated controls.
If you've installed the plugin correctly then this menu should appear automatically, and will self-populate with any saves based on the ```window.storeName``` you provided. Aside from the obvious UI injection, this interface is relatively non-invasive and shouldn't heavily effect your development workflow. 

### Save Mod Commands
Unlike the quick save menu, the sm_ commands (sm_load, and sm_save) are a highly invasive way of interfacing with the save/load functionality provided by the plugin and ChoiceScript interpreter. As they are new and unofficial commands, they will at the very least, cause issues with QuickTest and RandomTest (and will likely require commenting out). Usage of these commands may also produce some unexpected behaviour, such as load/save loops, or duplicate saves (when loading/refreshing *into* a page containing a save command).

![Presenting information about saves](../assets/images/docs_cmd_example_1.jpg?raw=true)

Note that unlike the previous smPlugin.js addon, the \*sm_save command will **not** save the game at the exact position it appears, but will rather in effect save from the start of the *current* visible page (regardless of where it is placed in the code).

That said, usage of these commands does still allow for more developer flexibility over how saving/loading is implemented in the game. Some examples being the implementation of autosaves, or restricting saving/loading to certain menus or game segments.

![Showing a choice of saves to load](../assets/images/docs_cmd_example_2.jpg?raw=true)

You can see the ```save.txt``` file in this repostiory's examples folder for inspiration on how to use the following commands.

#### \*sm_save
Creates a new save at the point of the last 'page' turn. Optionally, a string name for the save can be provided.

```*sm_save```, ```*sm_save "My Save Name"``` or ```*sm_save my_string_var``` etc.

#### \*sm_load

Loads the game with the given id.

```*sm_load my_save_id``` or ```*sm_load 1390323109``` etc.

#### \*sm_delete

Deletes the save with the given id.

```*sm_delete my_save_id``` or ```*sm_delete 3211245125``` etc.

### \*sm_update

Populates (or updates) the following helper variables:

- (number) ```_sm_save_count```: The number of saves detected.
- (array of numbers) ```_sm_save_id_x```: These variables hold the ID (used for loading and deleting) of the given save.
- (array of strings) ```_sm_save_name_x```: These variables hold the name for the given save (if it has one).
- (array of strings) ```_sm_save_date_x```: These variables hold a string formatted date marking the save time.

#### \*sm_menu

Disable (hide) or enable (show) the quick save menu.

```*sm_menu true``` enables (shows).
```*sm_menu false``` disables (hides).

