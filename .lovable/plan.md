
## Fix why Get_DMR is not showing, then render header rows + item popup

### Root cause

The main issue is not the table component first — it is the **middleware response**.

Your middleware log says:

```text
GET /api/gate/headers 200 810
```

That `200` is misleading. The frontend network snapshot shows `/api/gate/headers` is returning:

```html
<html> ... location="https://...authentication.../oauth/authorize?... </html>
```

So the middleware is currently getting an **SAP login / OAuth redirect page**, not the JSON payload you pasted.

That means:

- SAP is **not returning the GateHeader JSON** to the middleware
- the UI receives HTML instead of JSON
- therefore the DMR table cannot show rows

Also, even after auth is fixed, the current UI still needs one more improvement:
- user-created `Get_DMR` APIs may have `rowsPath/rowKey/childKey`
- but if `responseHeaderFields` / `responseItemFields` are incomplete, the table can still appear blank or partial

### What will be changed

#### 1. Make the middleware fail correctly when SAP returns login HTML
Files:
- `middleware/src/sapClient.js`
- `middleware/src/util/errors.js`

Changes:
- detect SAP responses that are HTML / login redirect instead of OData JSON
- detect OAuth redirect markers like `oauth/authorize`, `text/html`, or login callback HTML
- throw a structured error such as:
  - `sap_auth_redirect`
  - `sap_non_json_response`
- include upstream status + content-type in the error envelope

Result:
- no more false “200 success” when SAP actually returned a login page

#### 2. Add support for the auth mode your SAP tenant actually needs
File:
- `middleware/src/sapClient.js`

Changes:
- keep current Basic auth path
- add optional Bearer/OAuth header support so the middleware can call BTP tenants that do not accept plain Basic auth
- choose auth from env/config instead of assuming Basic always works

Result:
- the middleware can be aligned with the same auth method that works in your SAP/Postman setup

#### 3. Show a clear frontend error instead of a blank table
Files:
- `src/hooks/useSapProxy.ts`
- `src/components/SapLiveTable.tsx`

Changes:
- map middleware auth errors to a clear message:
  - “SAP redirected the middleware to login. The proxy is not authenticated yet.”
- keep the live-table UI visible, but show the exact failure reason
- prevent silent blank state when the payload is HTML

Result:
- you will immediately know whether the problem is auth, proxy URL, or schema

#### 4. Guarantee header columns render for gate APIs
File:
- `src/lib/sapApiSchemas.ts`

Changes:
- for gate-shaped APIs (`Get_DMR`, `Create_Gate_Service`, `ZUI_Gate_Service`):
  - default `rowsPath = "value"`
  - default `rowKey = "gate_id"`
  - default `childKey = "_Item"`
  - if response columns are missing, fallback to the standard gate header/item field definitions

Result:
- once real JSON comes from SAP, header rows will render even if the API field setup is incomplete

#### 5. Change item display from row-expand to popup
File:
- `src/components/SapLiveTable.tsx`

Changes:
- show header data directly in the main table
- add an `Items` column with count/button
- clicking the button opens a dialog/popup
- popup shows `_Item` rows in a child table

Result:
- exactly the flow you asked for:
  - first header rows visible
  - item details open separately in popup

### Important technical note

Your pasted SAP JSON is valid for the UI shape:

```text
value[] -> header rows
_Item[] -> item rows
gate_id -> row key
```

So the data model is fine.

The real blocker is:

```text
SAP endpoint currently returns HTML login redirect to the middleware
instead of JSON
```

Until that is fixed, no table change alone can show your data.

### Required config alignment

The implementation will also verify that the middleware uses the same working access method as your SAP test:

- if your JSON works in Postman with **Basic auth**, we will keep Basic and improve failure detection
- if your JSON works only with **OAuth / bearer token / interactive BTP login**, the middleware must use that same auth method

Also:
- Lovable preview should use a **public HTTPS middleware URL** (ngrok or deployed proxy)
- `http://localhost:8080` is not a reliable final preview target for the cloud preview flow

### Expected result after fix

On DMR → SAP Gate Entries:

- `Get_DMR` header rows will show in the main table
- each row will have an `Items` action/count
- clicking it will open a popup with `_Item` data
- if SAP auth is still wrong, the UI will show a clear auth error instead of blank data

### Technical details

```text
Frontend expected shape:
data.value[]                -> table rows
row.gate_id                 -> unique key
row._Item[]                 -> popup item rows
```

```text
Current failure:
Frontend -> /api/gate/headers
Middleware -> SAP
SAP -> HTML login redirect page
Middleware -> passes 200 HTML back
UI -> cannot parse/render GateHeader rows
```

### Files to update

- `middleware/src/sapClient.js`
- `middleware/src/util/errors.js`
- `src/hooks/useSapProxy.ts`
- `src/lib/sapApiSchemas.ts`
- `src/components/SapLiveTable.tsx`
