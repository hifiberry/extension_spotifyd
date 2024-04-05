// spotifyd CONTROL FOR BEOCREATE
const { updateAttribValueConfig, 
        getExtensionStatus, 
        setExtensionStatus,
        restartExtension,
        parseConfigFile,
        applyChangesPreservingComments } = 
 require(global.beo.extensionDirectory+'/hbosextensions/utilities');

const extensionName = "spotifyd"
const configFile = "/etc/spotifyd.conf"

spotifydconfig = {}
spotifydsettings = {}


var version = require("./package.json").version;

// Listen for general events
beo.bus.on('general', function(event) {
    // Handle system startup
    if (event.header == "startup") {
        // Check if the sources extension is available and set it up
        if (beo.extensions.sources &&
            beo.extensions.sources.setSourceOptions &&
            beo.extensions.sources.sourceDeactivated) {
            sources = beo.extensions.sources;
        }

        // Configure Spotify source options if sources are available
        if (sources) {
            getExtensionStatus(extensionName, function(enabled) {
                sources.setSourceOptions("spotifyd", {
                    enabled: enabled,
                    transportControls: true,
                    usesHifiberryControl: true,
                    aka: ["Spotify","spotifyd.instance1"]
                });
                spotifydsettings.spotifydEnabled = enabled
                beo.bus.emit("ui", {target: "spotifyd", header: "spotifydSettings", content: spotifydsettings})
            });
        }

        // Perform initial configuration reading
        spotifyconfig=parseConfigFile(configFile);
	if (spotifyconfig.global && 
		spotifyconfig.global.username && 
		!spotifyconfig.global.username.comment && 
		spotifyconfig.global.password && 
		!spotifyconfig.global.password.comment) {
		spotifydsettings.loggedInAs = spotifyconfig.global.username;
	} else {
		spotifydsettings.loggedInAs = false;
	}

        // Disable Spotify in the sources if no configuration is present
        if (sources && Object.keys(configuration).length === 0) {
            sources.setSourceOptions("spotifyd", {enabled: false})
        }
    }

    // Respond to activation of the Spotify extension
    if (event.header == "activatedExtension") {
        if (event.content.extension == "spotifyd") {
            // Notify the UI about the current Spotify settings
            console.log(spotifydsettings)
            beo.bus.emit("ui", {target: "spotifyd", header: "spotifydSettings", content: spotifydsettings})
        }
    }
});

// Listen for events related to Spotify
beo.bus.on('spotifyd', function(event) {

console.log(event)

  if (event.header == "spotifydEnabled") {
    if (event.content.enabled !== undefined) {
      setExtensionStatus(extensionName, event.content.enabled, function(newStatus, error) {
        // Emit updated settings to UI
        spotifydsettings.spotifydEnabled = event.content.enabled
        beo.bus.emit("ui", {target: "spotifyd", header: "spotifydSettings", content: spotifydsettings});

        // Update source options based on new status
        if (sources) sources.setSourceOptions("spotifyd", {enabled:  event.content.enabled});

        // Handle deactivation
        if (event.content.enabled === false) {
          if (sources) sources.sourceDeactivated("spotifyd");
        }

        // Handle errors
        if (error) {
          beo.bus.emit("ui", {target: "spotifyd", header: "errorTogglingSpotifyd", content: {}});
        }
      });
    }
  }


  if (event.header == "login") {
    if (event.content.username && event.content.password) {
      try {
        // Apply new login credentials
        applyChangesPreservingComments(configFile, [
          { section: "global", option: "username", value: event.content.username },
          { section: "global", option: "password", value: event.content.password }
        ]);

        // Restart the service to apply changes
        restartExtension('spotifyd', (success, error) => {
          if (error) {
            console.error("Failed to restart the service:", error);
            beo.bus.emit("ui", { target: "spotifyd", header: "serviceRestartError" });
            return; // Exit if unable to restart the service
          }

          // Update settings to reflect the changes made
          settings.loggedInAs = event.content.username;

          // Notify the UI about the updated settings
          beo.bus.emit("ui", { target: "spotifyd", header: "spotifydSettings", content: settings });

          console.log("Service restarted successfully.");
        });
      } catch (error) {
        console.error("Failed to apply login credentials:", error);
        // Optionally, notify the UI about the failure to update the configuration
        beo.bus.emit("ui", { target: "spotifyd", header: "logInError" });
        // Further error handling or logging as needed
      }
    }
  }

  if (event.header == "logout") {
    settings.loggedInAs = false;
    try {
      applyChangesPreservingComments(configFile, [
        { section: "global", option: "username", remove: true },
        { section: "global", option: "password", remove: true }
      ]);

      // Restart the service to apply changes
      restartExtension('spotifyd', (success, error) => {
        if (error) {
          console.error("Failed to restart the service:", error);
          beo.bus.emit("ui", { target: "spotifyd", header: "serviceRestartError" });
          return; // Exit if unable to restart the service
        }

        // If changes are applied successfully and service is restarted, emit the updated settings
        beo.bus.emit("ui", { target: "spotifyd", header: "spotifydSettings", content: settings });
        console.log("Service restarted successfully.");
      });
    } catch (error) {
      // Log the error or handle it as needed
      console.error("Failed to apply changes to the configuration file:", error);
      // Optionally, notify the UI about the error
      beo.bus.emit("ui", { target: "spotifyd", header: "configurationError", content: { error: "Failed to update settings" } });
    }
  }


});

module.exports = {
	version: version,
};

