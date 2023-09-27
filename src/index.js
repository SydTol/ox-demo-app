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
  overwriteFile,
  getSourceUrl
} from "@inrupt/solid-client";

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

let detailedData = [];
const locradValues = [25, 50, 75, 100, 150, 200, 300, 400, 500, 600];
let currentData = [];
let smartwatchData = [];
var map = [];

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
    page1.style.display = "none";
    waitpage.style.display = "block";
    // Update the page with the status.
    document.getElementById("myWebID").value = session.info.webId;
    waitpage.style.display = "none";
    if (session.info.webId === "https://test.pod.ewada.ox.ac.uk/SydChaOx/profile/card#me") {
      page2.style.display = "Flex";
      viewData();

    } else if (session.info.webId === "https://sydcha.solidcommunity.net/profile/card#me") {
      page3.style.display = "Flex";
    } else {
      console.log(document.getElementById("myWebID").value);
    }
  }
}

function makeMap(){
  map = L.map('map').setView([51.4774, 0.0007], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}


handleRedirectAfterLogin();

async function viewData() {
  try {
    

    const webID = document.getElementById("myWebID").value;

    const mypods = await getPodUrlAll(webID, { fetch: fetch });
    // const auth = solid.auth;
    const auth = getDefaultSession();
    const fc = new SolidFileClient(auth);
    const folder = await fc.readFolder(ChildPodLink);
    smartwatchData = [];

    // Use Promise.all to await all the asynchronous file reading operations
    const promises = folder.files.map(file => fc.readFile(file.url));
    const data = await Promise.all(promises);

    smartwatchData = data;
    console.log(smartwatchData[0]);
    const singleString = smartwatchData[0];
    const coordinateStrings = singleString.split('\n');
    detailedData = coordinateStrings.map(coordStr => {
      const [lat, lon] = coordStr.replace(/[\[\]]/g, '').split(',').map(Number);
      return [lat, lon];
    })

    genData();
    makeMap();
    genShapes();


  } catch (error) {
    console.log(error);
    labelCreateStatus.textContent = "Error" + error;
    labelCreateStatus.setAttribute("role", "alert");
  }

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

async function overwriteSharedArray(){
  try {
    const dataToSave = {
      currentData: currentData,
      locationSlider: locationDetailSlider.value.toString(),
      timeSlider: displayDetailSlider.value.toString(),
    };
    // Create a Blob from the text content
    const dataToSaveString = JSON.stringify(dataToSave);
    const blob = new Blob([dataToSaveString], { type: 'text/csv' });

    // Create a File object with the Blob and file name
    const file = new File([blob], "SmartwatchData", { type: 'text/csv' });

    // Call the existing function to save the file
    const savedFile = await overwriteFile(
      `${SharedPodLink}${file.name}`,           // Container URL
      file,                         // File
      {contentType: file.type, fetch: fetch }
    );

    console.log(`File saved at ${getSourceUrl(savedFile)}`);
  } catch (error) {
    console.error(error);
  }
}




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



var markerLayer = L.layerGroup();

function genShapes() {

  const locdet = parseInt(locationDetailSlider.value);
  const disdet = parseInt(displayDetailSlider.value);

  console.log(locdet);
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


locationDetailSlider.addEventListener("input", function () {
  const locationDetailValue = parseInt(locationDetailSlider.value);
  const displayDetailValue = parseInt(displayDetailSlider.value);

  genData();
  genShapes()

});

displayDetailSlider.addEventListener("input", function () {
  const displayDetailValue = parseInt(displayDetailSlider.value);
  const locationDetailValue = parseInt(locationDetailSlider.value);

  genData();
  genShapes();
});

