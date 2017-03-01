var Settings = aviJS.Settings;

// Saves options to chrome.storage.sync.
function save_options() {
    chrome.extension.getBackgroundPage().console.log('in save options...');
    var settings = {};
    for (var i = 0; i < Settings.Count; i++) {
        var key       = Settings.Names[i];
        settings[key] = document.getElementById(key).checked;
    }

    chrome.storage.sync.set(settings, function () {
        // Update status to let user know options were saved.
        var statusEl         = document.getElementById('status');
        statusEl.textContent = 'Options saved.';
        setTimeout(window.close, 1000);
    });
}

// Restores select box and checkbox state using the preferences stored in chrome.storage.
function restore_options() {
    chrome.storage.sync.get(Settings.Defaults, function (items) {
        for (var i = 0; i < Settings.Count; i++) {
            var key                              = Settings.Names[i];
            document.getElementById(key).checked = items[key];
        }
    });
}


document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
