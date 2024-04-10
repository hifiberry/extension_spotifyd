var spotifyd = (function() {

var spotifydEnabled = undefined;
var spotifydMPRIS = false;


$(document).on("spotifyd", function(event, data) {
	if (data.header == "spotifydSettings") {
		
		if (data.content.spotifydEnabled) {
			spotifydEnabled = true;
			$("#spotifyd-enabled-toggle").addClass("on");
		} else {
			spotifydEnabled = false;
			$("#spotifyd-enabled-toggle").removeClass("on");
		}

		if (data.content.mpris) {
			spotifydMPRIS = true;
			$("#spotifyd-mpris-toggle").addClass("on");
		} else {
			spotifydMPRIS = false;
			$("#spotifyd-mpris-toggle").removeClass("on");
		}

		if (data.content.loggedInAs) {
			$("#spotifyd-logged-in-section").removeClass("hidden");
			$("#spotifyd-logged-out-section").addClass("hidden");
			$(".spotifyd-username").text(data.content.loggedInAs);
		} else {
			$("#spotifyd-logged-in-section").addClass("hidden");
			$("#spotifyd-logged-out-section").removeClass("hidden");
			$(".spotifyd-username").text("");
		}
                beo.notify();
	}
	
	if (data.header == "logInError") {
		//beo.ask("spotifyd-login-error-prompt");
		beo.notify({title: "Error logging in", message: "The user name or password may be incorrect, or the account is not a Spotify Premium account.", timeout: false, buttonTitle: "Dismiss", buttonAction: "close"});
	}
});


function toggleEnabled() {
	enabled = (!spotifydEnabled) ? true : false;
	if (enabled) {
		beo.notify({title: "Turning Spotifyd on...", icon: "attention", timeout: false});
	} else {
		beo.notify({title: "Turning Spotifyd off...", icon: "attention", timeout: false});
	}
	beo.send({target: "spotifyd", header: "spotifydEnabled", content: {enabled: enabled}});
}

function toggleMPRIS() {
	enabled = (!spotifydMPRIS) ? true : false;
	if (enabled) {
		beo.notify({title: "Turning MPRIS on...", icon: "attention", timeout: false});
	} else {
		beo.notify({title: "Turning MPRIS off...", icon: "attention", timeout: false});
	}
        console.log("en");
	beo.send({target: "spotifyd", header: "spotifydMPRIS", content: {enabled: enabled}});
}


function login() {
	
	beo.startTextInput(3, "Log In with Spotify", "Enter your Spotify user name and password.", {placeholders: {password: "Password", text: "User name"}, minLength: {text: 2, password: 3}}, function(input) {
		if (input) {
			beo.send({target: "spotifyd", header: "login", content: {username: input.text, password: input.password}});
			beo.notify({title: "Updating settings...", icon: "attention", timeout: false, id: "spotify"});
		}
	});
}

function logout() {
	beo.send({target: "spotifyd", header: "logout"});
	beo.notify({title: "Updating settings...", icon: "attention", timeout: false, id: "spotify"});
}


return {
	toggleEnabled: toggleEnabled,
	toggleMPRIS: toggleMPRIS,
	login: login,
	logout: logout
};

})();