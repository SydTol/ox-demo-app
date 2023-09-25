// Import from "@inrupt/solid-client-authn-browser"
import {
  login,
  handleIncomingRedirect,
  getDefaultSession,
  fetch
} from "@inrupt/solid-client-authn-browser";

// Import from "@inrupt/solid-client"
import {
  addUrl,
  addStringNoLocale,
  createSolidDataset,
  createThing,
  getPodUrlAll,
  getPodUrlAllFrom,
  getSolidDataset,
  getWebIdDataset,
  getThingAll,
  getStringNoLocale,
  removeThing,
  saveSolidDatasetAt,
  setThing,
  saveFileInContainer,
  getSourceUrl
} from "@inrupt/solid-client";



// import SolidFileClient from 'solid-file-client/dist/window/solid-file-client.bundle.js';

const PodLink = "https://test.pod.ewada.ox.ac.uk/SydChaOx/AppendOnly/";
const selectorIdP = document.querySelector("#select-idp");

const buttonLogin = document.querySelector("#btnLogin");

const buttonShow = document.querySelector("#btnShow");
const labelCreateStatus = document.querySelector("#labelCreateStatus");
const buttonUpload = document.querySelector("#btnUpload")

const dropdownSelect = document.getElementById("dropdownSelect");
const timeSlider = document.getElementById("timeSlider");
const sliderValueDiv = document.getElementById("sliderValue");
const locationDetailSlider = document.getElementById("control-location-detail-slider");
const displayDetailSlider = document.getElementById("control-display-detail-slider");

const detailedData = [
  [51.4774, 0.0001],
  [51.4781, 0.0015],
  [51.4811, 0.0046],
  [51.4819, 0.0046],
  [51.4821, 0.0057],
  [51.4821, 0.0057],
  [51.4822, 0.0060],
  [51.4850, 0.0084],
  [51.4860, 0.0093],
  [51.4863, 0.0093],
  [51.4868, 0.0102],
  [51.4868, 0.0101],
  [51.4869, 0.0102],
  [51.4869, 0.0101],
  [51.4872, 0.0109],
  [51.4881, 0.0117],
  [51.4889, 0.0120],
  [51.4890, 0.0123],
  [51.4903, 0.0138],
  [51.4913, 0.0150]
];
// const FC = new SolidFileClient();
let currentData = [];

// buttonUpload.setAttribute("disabled", "disabled");

let smartwatchData = [];
let sliderValue = 1;

// 1a. Start Login Process. Call login() function.
function loginToSelectedIdP() {
  const SELECTED_IDP = document.getElementById("select-idp").value;

  return login({
    oidcIssuer: SELECTED_IDP,
    redirectUrl: new URL("/", window.location.href).toString(),
    clientName: "Getting started app"
  });
}

// 1b. Login Redirect. Call handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
  await handleIncomingRedirect(); // no-op if not part of login redirect

  const session = getDefaultSession();
  if (session.info.isLoggedIn) {
    // Update the page with the status.
    document.getElementById("myWebID").value = session.info.webId;

    // Enable Read button to read Pod URL

  }
}

// The example has the login redirect back to the root page.
// The page calls this method, which, in turn, calls handleIncomingRedirect.
handleRedirectAfterLogin();

// 2. Get Pod(s) associated with the WebID

// 3. Create the Reading List
async function viewData() {

  const webID = document.getElementById("myWebID").value;

  const mypods = await getPodUrlAll(webID, { fetch: fetch });
  // const auth = solid.auth;
  const auth = getDefaultSession();
  const fc = new SolidFileClient(auth);

  // fc.login("https://test.pod.ewada.ox.ac.uk").then(webId => {
  //   console.log(`Logged in as ${webId}.`)
  // }, err => console.log(err));
  // Update the page with the retrieved values.
  const folder = await fc.readFolder(PodLink);
  smartwatchData = [];
  try {
    // Clear the array before updating it with new file details
    smartwatchData = [];

    // Use Promise.all to await all the asynchronous file reading operations
    const promises = folder.files.map(file => fc.readFile(file.url));
    const data = await Promise.all(promises);

    smartwatchData = data;

    // Convert the array to a formatted string with line breaks
    const formattedData = smartwatchData.join("\n");

    document.getElementById("savedtitles").value = formattedData;



    console.log(smartwatchData)
  } catch (error) {
    console.log(error);
    labelCreateStatus.textContent = "Error" + error;
    labelCreateStatus.setAttribute("role", "alert");
  }

}


// Upload selected files into Container
function handleFiles() {
  const fileList = Array.from(document.getElementById('fileinput').files);
  const SELECTED_POD = document.getElementById("select-pod").value;
  const MY_POD_URL = PodLink;
  console.log(fileList)
  fileList.forEach(file => {
    placeFileInContainer(file, `${MY_POD_URL}`);
  });
}

// Upload file into the targetContainer.
async function placeFileInContainer(file, targetContainerURL) {
  try {
    const savedFile = await saveFileInContainer(
      targetContainerURL,           // Container URL
      file,                         // File 
      { slug: file.name, contentType: file.type, fetch: fetch }
    );
    console.log(`File saved at ${getSourceUrl(savedFile)}`);
  } catch (error) {
    console.error(error);
  }
}
buttonLogin.onclick = function () {
  loginToSelectedIdP();
};

buttonShow.onclick = function () {
  viewData();
};

buttonUpload.onclick = function () {
  handleFiles();
};


selectorIdP.addEventListener("change", idpSelectionHandler);
function idpSelectionHandler() {
  if (selectorIdP.value === "") {
    buttonLogin.setAttribute("disabled", "disabled");
  } else {
    buttonLogin.removeAttribute("disabled");
  }
}

var map = L.map('map').setView([51.4774, 0.0007], 13);
// var mapLessDetailed = L.map('map2').setView([51.4774, 0.0007], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);





var markerLayer = L.layerGroup();

function genShapes() {

  const locdet = parseInt(locationDetailSlider.value);
  const disdet = parseInt(displayDetailSlider.value);

  const locradValues = [25, 50, 75, 100, 150, 200, 300, 400, 500, 600];

  console.log(locdet);
  markerLayer.clearLayers();
  // if (locdet == 1) {
  for (const coordinates of currentData) {

    const [latitude, longitude] = coordinates; // Destructure the array into latitude and longitude
    var circle = L.circle([latitude, longitude], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.1,
      radius: locradValues[locdet - 1]
    }).addTo(markerLayer);

  }
  // } else if (locdet == 2) {

  //   var polygon = L.polygon([
  //     [51.50, 0.02],
  //     [51.46, -0.02],
  //     [51.46, 0.02]
  //   ]).addTo(markerLayer);

  // } else if (locdet == 3) {
  //   var circle = L.circle([51.475, 0.008575], {
  //     color: 'red',
  //     fillColor: '#f03',
  //     fillOpacity: 0.5,
  //     radius: 600
  //   }).addTo(markerLayer);
  // }

  markerLayer.addTo(map);



}

function genData() {
  const timedet = displayDetailSlider.value;
  const locdet = locationDetailSlider.value
  const locdetIncrement = 0.0002 * locdet;
  currentData = detailedData.filter((_, index) => index % timedet === 0);
  currentData = currentData.map(point => {
    const lat = point[0] + (Math.random() * 2 - 1) * locdetIncrement;
    const lon = point[1] + (Math.random() * 2 - 1) * locdetIncrement;
    return [lat, lon];
  });

  
}


// dropdownSelect.addEventListener("change", function () {

//   // Get the selected option value and text
//   const selectedValue = parseInt(dropdownSelect.value);


//   // Update the slider's max value and display related text
//   if (selectedValue === 2) {
//     timeSlider.max = 24;
//   } else if (selectedValue === 3) {
//     timeSlider.max = 7;
//   } else if (selectedValue === 4) {
//     timeSlider.max = 2;
//   } else {
//     timeSlider.max = 10; // Default max value
//   }

//   genShapes()


// });



locationDetailSlider.addEventListener("input", function () {
  const locationDetailValue = parseInt(locationDetailSlider.value);

  // Get the current value of displayDetailSlider
  const displayDetailValue = parseInt(displayDetailSlider.value);





  // Check if the locationDetailValue is smaller than the displayDetailValue
  // if (locationDetailValue > displayDetailValue) {
  //   // If it is, set the value of displayDetailSlider to match locationDetailValue
  //   displayDetailSlider.value = locationDetailValue;
  // }
  genData();
  genShapes()

});

displayDetailSlider.addEventListener("input", function () {
  const displayDetailValue = parseInt(displayDetailSlider.value);
  const locationDetailValue = parseInt(locationDetailSlider.value);
  // Update the minimum value of locationDetailSlider to match displayDetailValue

  // if (displayDetailValue < locationDetailValue) {
  //   // If it is, set the value of displayDetailSlider to match locationDetailValue
  //   locationDetailSlider.value = displayDetailValue;
  // }
  genData();
  genShapes();
});
genData();
genShapes();
