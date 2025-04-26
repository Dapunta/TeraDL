// Global variables
const box_result = document.getElementById('result');

const api = 'http://127.0.0.1:5000'; // Change This
// const api = 'https://teradl-api.dapuntaratya.com'; // Change This

let buffer = '';
let list_file;
let params;
let mode = 3;

// Add Event Listener Input
const inputForm = document.getElementById('terabox_url');
inputForm.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const url = inputForm.value;
        readInput(url);
    }
});

// Add Event Listener Submit Button
const submitButton = document.getElementById('submit_button');
submitButton.addEventListener('click', (event) => {
    const url = inputForm.value;
    readInput(url);
});

// HTML template for the Download All container
const downloadAllContainerHTML = `
<div id="download-all-container" class="download-all-container inactive" style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
    <button id="download-all-button" type="button" class="download-all-button">Download All</button>
    <span class="download-all-warning">Note: This downloads all files individually. Please allow multiple downloads in your browser if prompted.</span>
</div>`;

// Loading Spinner 1
function loading(element_id, active) {
    const loadingBox = document.getElementById(element_id);
    if (active)  {
        loadingBox.innerHTML = `<div id="loading-spinner" class="spinner-container"><div class="spinner"></div></div>`;
        loadingBox.style.pointerEvents = 'none';
    }
    else {
        loadingBox.innerHTML = `<i class="fa-solid fa-arrow-right"></i>`;
        loadingBox.style.pointerEvents = 'auto';
    }
}

// Loading Spinner 2
function loading2(element_id, active) {
    const loadingBox = document.getElementById(element_id);
    if (active)  {
        loadingBox.innerHTML = `<div id="loading-spinner" class="spinner-container"><div class="spinner2"></div></div>`;
        loadingBox.style.pointerEvents = 'none';
    }
    else {
        loadingBox.innerHTML = `Failed`;
        loadingBox.style.pointerEvents = 'auto';
    }
}

// Loading Spinner 3
function loading3(element_id, active) {
    const loadingBox = document.getElementById(element_id);
    if (active)  {
        loadingBox.innerHTML = `<div id="loading-spinner" class="spinner-container"><div class="spinner2"></div></div>`;
        loadingBox.style.pointerEvents = 'none';
    }
    else {
        loadingBox.innerHTML = `<i class="fa-solid fa-play"></i>`;
        loadingBox.style.pointerEvents = 'auto';
    }
}

// Loading Spinner 
function loading4(element_id, active) {
    const loadingBox = document.getElementById(element_id);
    if (active)  {
        loadingBox.innerHTML = `<div id="loading-spinner" class="spinner-container4"><div class="spinner4"></div></div>`;
        loadingBox.style.pointerEvents = 'none';
    }
    else {
        loadingBox.innerHTML = ``;
        loadingBox.style.pointerEvents = 'auto';
    }
}

// Time Sleep
function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s*1000));
}

// Get App Config

async function getConfig() {
    const url = `${api}/get_config`;
    const headers = {'Content-Type':'application/json'};
    const data = {
        'method'  : 'GET',
        'mode'    : 'cors',
        'headers' : headers
    };
    const req = await fetch(url, data);
    const response = await req.json();
    return(response.mode);
}

// Read Input
async function readInput(raw_url) {

    const url = raw_url.replace(/\s/g, '') === '' ? null : raw_url;

    if (url) {
        list_file = [];
        params = {};

        const stream_box = document.getElementById(`stream-video`);
        stream_box.innerHTML = '';
        stream_box.className = 'stream-video-section inactive'

        clearResult(); // Clear previous results, including the old button container
        loading('submit_button', true);
        await fetchURL(url);
        loading('submit_button', false);
        inputForm.value = '';
    }

    else {
        loading('submit_button', false);
        inputForm.value = '';
    }
}

// Fetch URL
async function fetchURL(url) {

    mode = await getConfig();
    changeStatus(mode);

    const get_file_url = `${api}/generate_file`;
    const headers = {'Content-Type':'application/json'};
    const data = {
        'method'  : 'POST',
        'mode'    : 'cors',
        'headers' : headers,
        'body'    : JSON.stringify({'url':url, 'mode':mode})
    };

    try {
        const req = await fetch(get_file_url, data);
        const response = await req.json();

        if (response.status == 'success') {
            // Clear previous results and add the button container structure first
            clearResult();
            box_result.innerHTML = downloadAllContainerHTML;
            addDownloadAllEventListener(); // Re-attach listener after adding the button

            // Now process and display the files
            params = response;
            await sortFile(response.list);

            // Show the button container *if* files were actually added by sortFile
            const fileItems = box_result.querySelectorAll('.container-item');
            const downloadAllContainer = document.getElementById('download-all-container'); 
            if (fileItems.length > 0 && downloadAllContainer) {
                 downloadAllContainer.classList.remove('inactive');
            } else if (downloadAllContainer) {
                 downloadAllContainer.classList.add('inactive');
            }
        }

        else {
            errorFetch();
        }
    } catch (error) {
        errorFetch();
    }
}

// Error Fetch
function errorFetch() {
    clearResult();
    box_result.innerHTML = `
        <div class="error-message">
            Fetch Failed
        </div>`;
}

// Clear Result
function clearResult() {
    box_result.innerHTML = '';

    const streamSection = document.getElementById('stream-video');
    streamSection.innerHTML = '';
    streamSection.classList.add('inactive');
}

// Sort File Recursively
async function sortFile(list_file) {
    list_file.forEach((item) => {
        if (item.is_dir == 1) {sortFile(item.list);}
        else {printItem(item);}
    });
}

// Show Item
async function printItem(item) {
    const new_element = document.createElement('div');
    new_element.id = `file-${item.fs_id}`;
    new_element.className = 'container-item';
    if (item.link) {
        new_element.dataset.dlink = item.link;
    }
    new_element.innerHTML = `
        <div class="container-item-default">
            <div id="image-${item.fs_id}" class="container-image"><img src="${item.image}" onclick="zoom(this)"></div>
            <div class="container-info">
                <span id="title-${item.fs_id}" class="title">${item.name}</span>
                <div class="container-button">
                    <div id="container-download-${item.fs_id}" class="container-download-button">
                        <button id="get-download-${item.fs_id}" type="button" class="download-button">Download ${convertToMB(item.size)} MB</button>
                    </div>
                    <div class="${item.type == 'video' ? 'container-stream-button-valid' : 'container-stream-button-invalid'}">
                        <button id="stream-${item.fs_id}" type="button" class="stream-button"><i class="fa-solid fa-play"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    box_result.appendChild(new_element);

    const downloadButton = new_element.querySelector(`#get-download-${item.fs_id}`);
    downloadButton.addEventListener('click', () => {
        if (mode == 1) initDownload(item.fs_id);
        else if (mode == 2) initDownload(item.fs_id, item.link);
        else if (mode == 3) initDownload(item.fs_id);
    });

    const streamButton = new_element.querySelector(`#stream-${item.fs_id}`);
    streamButton.addEventListener('click', () => {
        if (mode == 1) initStream(item.fs_id);
        else if (mode == 2) initStream(item.fs_id, item.link);
        else if (mode == 3) initStream(item.fs_id);
    });
}

// Convert Bytes To MegaBytes
function convertToMB(bytes) {
    const MB = bytes / (1024 * 1024);
    return MB.toFixed(0);
}

// Initialization for download
async function initDownload(fs_id, dlink=null) {

    loading2(`get-download-${fs_id}`, true);

    let param;
    if (dlink) {param = {'url':dlink, 'mode':mode};}
    else {param = {...params, 'fs_id':fs_id, 'mode':mode};}

    const get_link_url = `${api}/generate_link`;
    const headers = {'Content-Type':'application/json'};
    const data = {
        'method'  : 'POST',
        'mode'    : 'cors',
        'headers' : headers,
        'body'    : JSON.stringify(param)
    };

    const req = await fetch(get_link_url, data);
    const response = await req.json();

    if (response.status == 'success') {
        const box_button = document.getElementById(`container-download-${fs_id}`);
        box_button.innerHTML = '';
        const downloadLinks = response.download_link;
        Object.entries(downloadLinks).forEach(([key, value], index) => {

            const new_element = document.createElement('button');
            new_element.id = `download-${index+1}-${fs_id}`;
            new_element.innerText = index+1;
            new_element.className = 'download-button';
            new_element.setAttribute('value',value);
            box_button.appendChild(new_element);

            new_element.addEventListener('click', () => startDownload(new_element.value)); // Keep this for individual buttons
        });
    }

    else {
        loading2(`get-download-${fs_id}`, false);
    }
}

// Start Download
function startDownload(url, filename = '') { // Optional filename parameter
    const anchor = document.createElement('a');
    anchor.href = url;
    // JANGAN gunakan anchor.download di sini!

    // this case is for multiple download, so that the browser will not open many new tab (biar ga open new tab banyak)
    // anchor.target = '_blank';

    // can be used to set custom filename
    anchor.download = filename || ''; // Use provided filename or empty string -> banh ini kyknya ga masalah? soalnya butuh buat download semua

    // Append, click, remove is still necessary to trigger the download
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

// Initialization for stream
async function initStream(fs_id, dlink=null) {

    const stream_box = document.getElementById(`stream-video`);
    loading3(`stream-${fs_id}`, true);

    const url_stream = await getURLStream(fs_id, dlink);
    stream_box.className = 'stream-video-section';
    stream_box.innerHTML = '';
    stream_box.innerHTML = `
        <video controls>
            <source id="stream-video-${fs_id}" src="${url_stream}" type="video/mp4">
            Your browser does not support the video tag.
        </video>`;
    loading3(`stream-${fs_id}`, false);
    
}

// Get URL Stream
async function getURLStream(fs_id, dlink=null) {
    let param;

    try {
        if (dlink) {param = {'url':dlink, 'mode':mode};}
        else {param = {...params, 'fs_id':fs_id, 'mode':mode};}

        const get_link_url = `${api}/generate_link`;
        const headers = {'Content-Type':'application/json'};
        const data = {
            'method'  : 'POST',
            'mode'    : 'cors',
            'headers' : headers,
            'body'    : JSON.stringify(param)
        };

        const req = await fetch(get_link_url, data);
        const response = await req.json();

        if (response.status == 'success') {
            // const old_url = response['download_link']['url_2'];
            // const old_domain = old_url.match(/:\/\/(.*?)\./)[1];
            // const stream_url = old_url.replace(old_domain, 'kul-ddata').replace('by=themis', 'by=dapunta');
            const stream_url = response['download_link']['url_2'];
            return(stream_url);
        }
        else return('');
    }
    catch {return('');}
}

// Get and Start Download All)
async function getAndStartDownload(fs_id, dlink = null, linkPreference = 'url_2', filename = '') { // Added filename parameter
    console.log(`Attempting to get link for fs_id: ${fs_id}`);
    let param;
    if (dlink && mode === 2) { // Mode 2 uses provided dlink
        param = {'url': dlink, 'mode': mode};
    } else if (mode === 1 || mode === 3) { // Mode 1 and 3 need params
         if (!params || Object.keys(params).length === 0) {
             console.error("Global params not set for mode 1 or 3.");
             return;
         }
        param = {...params, 'fs_id': fs_id, 'mode': mode};
    } else {
        console.error(`Invalid mode (${mode}) or missing dlink for mode 2.`);
        return;
    }

    const get_link_url = `${api}/generate_link`;
    const headers = {'Content-Type': 'application/json'};
    const data = {
        'method': 'POST',
        'mode': 'cors',
        'headers': headers,
        'body': JSON.stringify(param)
    };

    try {
        const req = await fetch(get_link_url, data);
        const response = await req.json();

        if (response.status == 'success' && response.download_link) {
            const links = response.download_link;
            let urlToDownload = null;

            if (linkPreference === 'url_2' && links.url_2) {
                urlToDownload = links.url_2;
            } else if (links.url_1) {
                urlToDownload = links.url_1; // Fallback to url_1
            } else if (links.url_2) {
                 urlToDownload = links.url_2; // Use url_2 if url_1 wasn't available but url_2 is
            } else if (links.url_3) {
                 urlToDownload = links.url_3; // Fallback further if needed
            }


            if (urlToDownload) {
                console.log(`Starting download for fs_id: ${fs_id} using URL: ${urlToDownload}`);
                startDownload(urlToDownload, filename);
                await sleep(0.5); // Delay 500ms
            } else {
                 console.error(`No suitable download link found for fs_id: ${fs_id}`);
            }
        } else {
            console.error(`Failed to get download link for fs_id: ${fs_id}. Status: ${response.status}, Message: ${response.message || 'No message'}`);
        }
    } catch (error) {
        console.error(`Error fetching download link for fs_id: ${fs_id}:`, error);
    }
}


// Initialization for Download All
async function initDownloadAll(linkPreference = 'url_2') {
    const downloadAllButton = document.getElementById('download-all-button');
    if (downloadAllButton) {
        downloadAllButton.disabled = true;
        downloadAllButton.innerText = 'Downloading...';
    }

    const fileItems = box_result.querySelectorAll('.container-item');
    console.log(`Found ${fileItems.length} file items to download.`);

    if (fileItems.length === 0) {
        console.log("No files found to download.");
        if (downloadAllButton) {
            downloadAllButton.disabled = false;
            downloadAllButton.innerText = 'Download All';
        }
        return;
    }

     // Check if params are needed and available for modes 1 or 3
     if ((mode === 1 || mode === 3) && (!params || Object.keys(params).length === 0)) {
         console.error("Cannot start 'Download All': Required parameters (uk, shareid, etc.) are missing.");
         alert("Error: Could not retrieve necessary information to start downloads. Please try fetching the file list again.");
         if (downloadAllButton) {
             downloadAllButton.disabled = false;
             downloadAllButton.innerText = 'Download All';
         }
         return;
     }


    for (const item of fileItems) {
        const fs_id = item.id.replace('file-', '');
        let dlink = null;

        if (mode === 2) {
             dlink = item.dataset.dlink;
             if (!dlink) {
                 console.warn(`Could not find dlink for fs_id: ${fs_id} in mode 2. Skipping this file.`);
                 continue;
             }
        }

        const titleSpan = item.querySelector('.title');
        const filename = titleSpan ? titleSpan.innerText : '';

        await getAndStartDownload(fs_id, dlink, linkPreference, filename);
    }

    console.log("Finished attempting to download all files.");
    if (downloadAllButton) {
        downloadAllButton.disabled = false;
        downloadAllButton.innerText = 'Download All';
    }
}

// Function to add the event listener
function addDownloadAllEventListener() {
    const downloadAllButton = document.getElementById('download-all-button');
    if (downloadAllButton) {
        // Remove existing listener first to prevent duplicates if called multiple times
        downloadAllButton.replaceWith(downloadAllButton.cloneNode(true));
        // Get the new clone and add the listener
        const newButton = document.getElementById('download-all-button');
        if (newButton) {
             newButton.addEventListener('click', () => {
                 initDownloadAll('url_2'); // Default url_2 yg pertama masih error banh
             });
        }
    }
}


// Change status color
function changeStatus(mode) {
    const status_box = document.getElementById('status-mode');
    status_box.style.backgroundColor = (mode == 2) ? '#77ff7e' : '#ff7777';
}

// Initialization
async function main() {
    loading4('status-mode', true);
    const mode = await getConfig();
    loading4('status-mode', false);
    changeStatus(mode);
}

main();