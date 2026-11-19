# Aurexus Medusa – React only (no Node server, no SQL Server)

The same application and interface, as a pure React app. The 1,190 records from the consolidated CSV
are bundled inside the app (src/data/records.json) and searched, filtered, sorted and paged in the browser.

## Run
    npm install
    npm run dev          -> http://localhost:5173

## Build for hosting (any static web host / IIS / Nginx / SharePoint)
    npm run build        -> upload the contents of the dist folder

## Update the data
Replace data/data.csv with the new consolidated CSV (same columns), then:
    npm run build:data
    npm run dev   (or npm run build)

Images are still loaded from the links in the CSV (https://image2.aurexus.net/...).
