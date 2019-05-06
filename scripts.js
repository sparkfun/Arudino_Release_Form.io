// HIDE/VIEW PASSWORD
// https://www.w3schools.com/howto/howto_js_toggle_password.asp
function toggle() {
  let temp = document.getElementById("password");
  if (temp.type == "password") {
    temp.type = "text";
  } else {
    temp.type = "password";
  }
}

// 2 FACTOR AUTHENTIFICATION
// Turns on/off ability to write in 2 factor textbox
function twoFactor() {
  let temp = document.getElementById("twoFactor");

  if (temp.disabled == false) {
    temp.disabled = true;
  } else {
    temp.disabled = false;
  }
}

// GETS INFO FROM USER INPUTS
function getUserInfo() {

  let userInput = {
    name: $("#name").val(),
    email: $("#email").val(),
    password: $("#password").val(),
    twoFactor: $("#twoFactor").val(),
    libraryURL: $("#libraryURL").val(),
    description: $('#releaseDescription').val(),
    releaseType: $('input[name=releaseType]:checked', '#releaseTypeForm').val()
  };
  return userInput;
}

// CHECKS ALL ENTRY FIELDS ARE POPULATED
function validateTextFields(userInput, releaseInput) {
  var isValid = true;
  let isTwoFactor = document.getElementById("twoFactorCheckBox").checked;

  if (userInput.name == '')
    isValid = false;

  if (userInput.email == '')
    isValid = false;

  if (userInput.password == '')
    isValid = false;

  if (userInput.twoFactor == '' && isTwoFactor == true)
    isValid = false;
  else if (isTwoFactor == false)
    userInput.twoFactor = '';

  if (userInput.libraryURL == '')
    isValid = false;

  if (userInput.description == '')
    isValid = false;

  if (userInput.releaseType == null)
    isValid = false;

  return isValid;
}

/* GET LIBRARY VERSION NUMBER 
		Gets content associated with obtaining the 
    version number from the library.properties
    file 
*/
function getLibraryVersionNumber(_content, _sha) {
  let _decodeContent = atob(_content);																					// Base64 decoding of content/code
  let index = _decodeContent.indexOf("version=");																// Index of "v" in "version=""
  let _startIndex = _decodeContent.indexOf("=", index) + 1;											// Index of version number
  let _endIndex = _decodeContent.indexOf("\n", index);													// Index of endline
  let _versionString = _decodeContent.substring(_startIndex, _endIndex);				// Version number substring

  let versionNumberInfo = {
    decodeContent: _decodeContent,
    versionString: _versionString,
    startIndex: _startIndex,
    endIndex: _endIndex,
    sha: _sha
  };

  return versionNumberInfo;
}

/* BUMP VERSION NUMBER
		Increments verison number up to version 10.0.0
*/
function bumpVersionNumber(previousRelease, releaseType) {

  // Remove unwanted characters and split at "." into array
  previousRelease = previousRelease.replace(/[a-zA-Z_&+-]/gi, '');
  let releaseArray = previousRelease.split(".");
  let arrayLength = releaseArray.length;

  let newRelease;
  let num;

  // Check version number format. Make sure at least version 1.0 or above
  if (/^(100|[1-9][0-9]?)[.](100|[0-9][0-9]?)[.](100|[0-9][0-9]?)$/.test(previousRelease)) {
    if (releaseType == "patch") {
      num = String(Number(releaseArray[2]) + 1);
      releaseArray[2] = num;
    }
    else if (releaseType == "minor") {
      num = String(Number(releaseArray[1]) + 1);
      releaseArray[1] = num;
      releaseArray[2] = "0";
    }
    else {
      num = String(Number(releaseArray[0]) + 1);
      releaseArray[0] = num;
      releaseArray[1] = "0";
      releaseArray[2] = "0";
    }
    newRelease = releaseArray[0] + "." + releaseArray[1] + "." + releaseArray[2];
  } else {
    newRelease = "";
  }
  return newRelease
}

// CHECKBOX TO HIDE/VIEW PASSWORD
$('#passwordCheckBox').click(toggle);
$('#twoFactorCheckBox').click(twoFactor);

// USER PRESS BUTTON
$('#get').click(function () {

  $('.msg-container').css({ "background-color": "white" });

  let userInfo = getUserInfo();

  // CASE 1a: All text fields filled 
  if (validateTextFields(userInfo) == true) {


    let arrayURL = userInfo.libraryURL.split("/", 5);

    let propertiesURL = "https://api.github.com/repos/" + arrayURL[3] + "/" + arrayURL[4] + "/contents/library.properties";
    let releaseURL = "https://api.github.com/repos/" + arrayURL[3] + "/" + arrayURL[4] + "/releases";

    let auth = btoa(userInfo.email + ":" + userInfo.password);

    // CHECK FOR LIBRARY.PROPERTIES FILE 
    // https://developer.github.com/v3/repos/contents/#get-contents
    // GET /repos/:owner/:repo/contents/:path
    $.ajax({
      url: propertiesURL,

      // CASE 1b: library.properties exists 
      success: function (data) {
        // get version number from library.properties 
        let versionNumberInfo = getLibraryVersionNumber(data.content, data.sha);

        // CHECK FOR AN EXISTING RELEASE
        // https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository
        // GET /repos/:owner/:repo/releases
        $.ajax({
          url: releaseURL,
          success: function (data) {

            // CASE 1c: A release exists
            if (data.length > 0) {

              // Get tag from latest release 
              let previousReleaseTag = data[0].tag_name;
              let previousReleaseDescription = data[0].body;

              // CASE 1d: User meant to create a new release 
              if (userInfo.description != previousReleaseDescription) {

                // INCREASE VERSION NUMBER
                // First try with tag from latest release
                let newVersion = bumpVersionNumber(previousReleaseTag, userInfo.releaseType);
                // Then try version number form library.properties
                if (newVersion == '') {
                  newVersion = bumpVersionNumber(versionNumberInfo.versionString);
                }

                // CASE 1e: Successfully created new version number
                if (newVersion != '') {

                  // Input new version number in library.properties file
                  let updateLibrary = versionNumberInfo.decodeContent.replace(versionNumberInfo.versionString, newVersion);

                  // Construct commit message
                  var message = {
                    "message": "Update library.properties for release " + newVersion + ".",
                    "committer": {
                      "name": userInfo.name,
                      "email": userInfo.email
                    },
                    "content": btoa(updateLibrary),			// Base64 encoding
                    "sha": versionNumberInfo.sha
                  };

                  // PUSH LIBRARY.PROPERTIES INFO
                  // https://developer.github.com/v3/repos/contents/#update-a-file
                  // PUT /repos/:owner/:repo/contents/:path
                  $.ajax({
                    method: "PUT",
                    url: propertiesURL,
                    headers: {
                      authorization: "Basic " + auth,
                      "content-type": "application/json",
                      "x-github-otp": userInfo.twoFactor
                    },
                    data: JSON.stringify(message),

                    // CASE 1f: Succesfully updated library.properties file
                    success: function (data) {

                      let releaseTag = "v" + newVersion;
                      // Create a release 
                      var release = {
                        "tag_name": releaseTag,
                        "target_commitish": "master",
                        "name": releaseTag,
                        "body": userInfo.description,
                        "draft": false,
                        "prerelease": false
                      };

                      // CREATE A RELEASE
                      // https://developer.github.com/v3/repos/releases/#create-a-release
                      // POST /repos/:owner/:repo/releases
                      $.ajax({
                        method: "POST",
                        url: releaseURL,
                        headers: {
                          authorization: "Basic " + auth,
                          "content-type": "application/json",
                          "x-github-otp": userInfo.twoFactor
                        },
                        data: JSON.stringify(release),
                        success: function (data) {
                          $('.msg-container').css({ "background-color": "#53BF36" });
                          $('#errorMsg').html("");
                          $('#successMsg').html("SUCCESS! The latest release is now " + releaseTag + ".");
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                          $('.msg-container').css({ "background-color": "#F21905" });
                          $('#successMsg').html("");
                          $('#errorMsg').html("ERROR: An unknown error occurred while creaing the release. Please try again.");
                        }
                      });
                    },

                    // CASE 2f: Problem updating library.properties file
                    error: function (jqXHR, textStatus, errorThrown) {
                      $('.msg-container').css({ "background-color": "#F21905" });
                      $('#successMsg').html("");
                      $('#errorMsg').html("ERROR: Unable to authenticate. Please check that the e-mail, password, and 2 factor authentication fields are correctly populated. If you are using 2 Factor Authentication, please make sure that you are using a current one time password.");
                    }
                  });

                  // CASE 2e: Invalid version number format 
                } else {
                  $('.msg-container').css({ "background-color": "#F21905" });
                  $('#successMsg').html("");
                  $('#errorMsg').html("ERROR: Unable to read current format of version number in library.properties file or the version number of the release tag in releases. Please change library.properties version to be in the format of '#.#.#' (i.e. 'version = 1.0.0'). This program currently supports versions up to 100.100.100.");
                }
                // CASE 2d: Check if release created accidently
              } else {
                $('.msg-container').css({ "background-color": "#F21905" });
                $('#successMsg').html("");
                $('#errorMsg').html("ERROR: The release description is the same as the previous release description. To ensure this is not a duplicate release, please update the description before trying again.");
              }

              // CASE 2c: A release DOES NOT exist yet
            } else {
              $('.msg-container').css({ "background-color": "#F21905" });
              $('#successMsg').html("");
              $('#errorMsg').html("ERROR: No release yet. Please create the first release yourself. Don't forget to create an issue on the Arduino GitHub to ensure it's included in the Arduino Library Manager.");
            }
          }
        });
      },

      // CASE 2b: library.properties DOES NOT exist
      error: function (jqXHR, textStatus, errorThrown) {
        $('.msg-container').css({ "background-color": "#F21905" });
        $('#successMsg').html("");
        $('#errorMsg').html("ERROR: No library.properties file. Please first create a library.properties file and check that you included the complete file path in the form. If this is the first release for this library, please create the first release yourself. Don't forget to create an issue on the Arduino GitHub to ensure it's included in the Arduino Library Manager.");
      }
    });

    // CASE 2a: Not all text fields filled 
  } else {
    $('.msg-container').css({ "background-color": "#F21905" });
    $('#successMsg').html("");
    $('#errorMsg').html("Please fill in all required fields.")
  }

});