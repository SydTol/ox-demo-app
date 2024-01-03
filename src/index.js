// Import from "@inrupt/solid-client-authn-browser"
import {
  login,
  handleIncomingRedirect,
  getDefaultSession,
  fetch
} from "@inrupt/solid-client-authn-browser";

// Import from "@inrupt/solid-client"
import {
  getContentType,
  overwriteFile,
  getSourceUrl,
  getFile
} from "@inrupt/solid-client";

// Define URLs and elements
const ChildPodLink = "https://test.pod.ewada.ox.ac.uk/SydChaOx/Location/";
const SharedPodLink = "https://test.pod.ewada.ox.ac.uk/SydChaOx/Sharing/";
const selectorIdP = document.querySelector("#select-idp");
const buttonLogin = document.querySelector("#btnLogin");
const labelCreateStatus = document.querySelector("#labelCreateStatus");
const buttonSave = document.querySelector("#btnSave");
const locationDetailSlider = document.getElementById("control-location-detail-slider");
const displayDetailSlider = document.getElementById("control-display-detail-slider");
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
const waitpage = document.getElementById("waitingpage");

// Initialize data arrays and map variables
let detailedData = [];
const locradValues = [25, 50, 75, 100, 150, 200, 300, 400, 500, 600];
let currentData = [];
let smartwatchData = [];
var map = [];
var pmap = [];
var locdet = 1;
var disdet = 1;

// Function to initiate login to a selected Identity Provider (IDP)
function loginToSelectedIdP() {
  const SELECTED_IDP = document.getElementById("select-idp").value;

  return login({
    oidcIssuer: SELECTED_IDP,
    redirectUrl: new URL("/", window.location.href).toString(),
    clientName: "Getting started app"
  });
}

// Function to handle redirects after successful login
async function handleRedirectAfterLogin() {
  await handleIncomingRedirect(); 

  const session = getDefaultSession();
  // Hide page1 and display waitpage during authentication

  if (session.info.isLoggedIn) {
    page1.style.display = "none";
    waitpage.style.display = "block";
    // Update the page with the user's WebID and switch to the appropriate view
    document.getElementById("myWebID").value = session.info.webId;
    waitpage.style.display = "none";
    if (session.info.webId === "https://test.pod.ewada.ox.ac.uk/SydChaOx/profile/card#me") {
      page2.style.display = "Flex";
      childViewData();

    } else if (session.info.webId === "https://sydcha.solidcommunity.net/profile/card#me") {
      page3.style.display = "Flex";
      parentViewData();

    } else {
      console.log(document.getElementById("myWebID").value);
    }
  }
}

// Function to initialize the Leaflet map
function makeMap() {
  map = L.map('map').setView([51.4774, 0.0007], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Trigger the redirect handling after login
handleRedirectAfterLogin();

// Function to fetch and display child's smartwatch data
async function childViewData() {
  try {
    // Authenticate and read the folder content from the ChildPodLink
    const auth = getDefaultSession();
    const fc = new SolidFileClient(auth);
    const folder = await fc.readFolder(ChildPodLink);

    // Read the SmartwatchData file from the SharedPodLink
    const fileBlob = await getFile(`${SharedPodLink}SmartwatchData`, { fetch: fetch });

    // Read the content of each file in the folder
    const promises = folder.files.map(file => fc.readFile(file.url));
    const data = await Promise.all(promises);

    // Process smartwatch data into coordinate points
    smartwatchData = data;
    const singleString = smartwatchData[0];
    const coordinateStrings = singleString.split('\n');
    detailedData = coordinateStrings.map(coordStr => {
      const [lat, lon] = coordStr.replace(/[\[\]]/g, '').split(',').map(Number);
      return [lat, lon];
    });

    // Generate and display data on the map
    genData();
    makeMap();
    genShapes();

  } catch (error) {
    console.log(error);
    labelCreateStatus.textContent = "Error" + error;
    labelCreateStatus.setAttribute("role", "alert");
  }

}
// Function to read a file from the pod
async function readFileFromPod(fileURL) {
  try {
    const file = await getFile(
      fileURL,               // File in Pod to Read
      { fetch: fetch }       // fetch from authenticated session
    );

    console.log(`Fetched a ${getContentType(file)} file from ${getSourceUrl(file)}.`);

    return file;

  } catch (err) {
    console.log(err);
  }
}

// Function to fetch and display parent's smartwatch data
async function parentViewData() {
  try {
    
    // Authenticate and read the SmartwatchData file from the SharedPodLink
    const auth = getDefaultSession();
    const fc = new SolidFileClient(auth);
    const blob = await readFileFromPod(`${SharedPodLink}SmartwatchData`);

    // Extract text content and parse JSON
    const jsonText = await blob.text();
    const jsonObject = JSON.parse(jsonText);

    // Extract data and display on the Leaflet map
    currentData = jsonObject.currentData;
    locdet = jsonObject.locationSlider;
    disdet = jsonObject.timeSlider;

    // Initialize Leaflet map for parent view
    pmap = L.map('pmap').setView([51.4774, 0.0007], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(pmap);

    // Create a layer group for parent's marker and clear existing layers
    var pmarkerLayer = L.layerGroup();
    pmarkerLayer.clearLayers();
    
    // Display parent's current data as circle markers on the map
    if (currentData && currentData.length > 0) {
      for (const coordinates of currentData) {
        const [latitude, longitude] = coordinates; // Destructure the array into latitude and longitude
        L.circle([latitude, longitude], {
          color: 'red',
          fillColor: '#f03',
          fillOpacity: 0.1,
          radius: locradValues[locdet - 1]
        }).addTo(pmarkerLayer);

      }
      pmarkerLayer.addTo(pmap);
    } else {
      console.log("current data is null or empty")
    }
  } catch (error) {
    console.log(error);
    labelCreateStatus.textContent = "Error" + error;
    labelCreateStatus.setAttribute("role", "alert");
  }

}

// Function to overwrite the shared array in the parent's pod
async function overwriteSharedArray() {
  try {
    const dataToSave = {
      currentData: currentData,
      locationSlider: locationDetailSlider.value.toString(),
      timeSlider: displayDetailSlider.value.toString(),
    };
    // Create a Blob from the text content
    const dataToSaveString = JSON.stringify(dataToSave);
    const blob = new Blob([dataToSaveString], { type: 'text/plain' });

    // Create a File object with the Blob and file name
    const file = new File([blob], "SmartwatchData", { type: 'text/plain' });

    // Call the existing function to save the file
    const savedFile = await overwriteFile(
      `${SharedPodLink}${file.name}`,           // Container URL
      file,                         // File
      { contentType: file.type, fetch: fetch }
    );

    console.log(`File saved at ${getSourceUrl(savedFile)}`);
  } catch (error) {
    console.error(error);
  }
}


// Event listeners for login, save, and IDP selection

buttonLogin.onclick = function () {
  loginToSelectedIdP();
};


buttonSave.onclick = function () {
  overwriteSharedArray()
};


selectorIdP.addEventListener("change", idpSelectionHandler);
function idpSelectionHandler() {
  if (selectorIdP.value === "") {
    buttonLogin.setAttribute("disabled", "disabled");
  } else {
    buttonLogin.removeAttribute("disabled");
  }
}


// Initialize Leaflet marker layer for child's data

var markerLayer = L.layerGroup();

// Function to generate shapes (circles) on the map based on current data
function genShapes() {
  markerLayer.clearLayers();
  if (currentData && currentData.length > 0) {
    for (const coordinates of currentData) {
      const [latitude, longitude] = coordinates; // Destructure the array into latitude and longitude
      L.circle([latitude, longitude], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.1,
        radius: locradValues[locdet - 1]
      }).addTo(markerLayer);

    }
    markerLayer.addTo(map);
  } else {
    console.log("current data is null or empty")
  }

}

// Function to generate data based on location and display sliders
function genData() {

  const locdetIncrement = 0.0002 * locationDetailSlider.value;
  currentData = detailedData.filter((_, index) => index % displayDetailSlider.value === 0);
  currentData = currentData.map(point => {
    const lat = point[0] + (Math.random() * 2 - 1) * locdetIncrement;
    const lon = point[1] + (Math.random() * 2 - 1) * locdetIncrement;
    return [lat, lon];
  });

}

// Event listeners for sliders
locationDetailSlider.addEventListener("input", function () {
  locdet = parseInt(locationDetailSlider.value);

  genData();
  genShapes()

});

displayDetailSlider.addEventListener("input", function () {
  disdet = parseInt(displayDetailSlider.value);

  genData();
  genShapes();
});

