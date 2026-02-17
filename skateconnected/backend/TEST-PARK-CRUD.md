# Park CRUD – step-by-step test

Do these in order in **two terminals**. Use the **exact** commands.

---

## Terminal 1: run only the backend

1. **Stop anything else** that might use port 5001 (other Node apps, old backend process).
   ```bash
   lsof -i :5001
   ```
   If you see a process, note the PID and run: `kill <PID>` (or `kill -9 <PID>` if it won’t exit).

2. **Go to the backend folder and start the server:**
   ```bash
   cd /Users/davidthorne/DavidThorneFYP/skateconnected/backend
   node src/server.js
   ```

3. **Check the output.** You must see these two lines (in this order):
   - `✅ Connected to Postgres via Sequelize`
   - `✅ Models synced`
   - `✅ Backend listening on http://localhost:5001`

   **If you don’t see all three:** the server is not fully started. Common causes:
   - Postgres not running or wrong `DATABASE_URL` in `.env`
   - `DATABASE_URL` missing in `backend/.env`

   Leave this terminal open and running.

---

## Terminal 2: run the tests

Open a **new** terminal. Run each command and note: **does it return in a few seconds or hang?**

### Test 1 – Server up?

```bash
curl -s http://localhost:5001/health
```

- **Expected:** `{"ok":true}` (and in Terminal 1 you see `REQ IN: GET /health` and `REQ OUT: GET /health 200`).
- **If it hangs or “Connection refused”:** nothing is listening on 5001, or the wrong process is. Go back to Terminal 1 and fix startup.

---

### Test 2 – List parks (GET)

```bash
curl -s http://localhost:5001/park
```

- **Expected:** JSON array (e.g. `[]` or a list of parks). In Terminal 1 you should see `REQ IN: GET /park` and `REQ OUT: GET /park 200`.
- **If it hangs:** the problem is in the GET /park handler or DB (e.g. `Park.findAll`).

---

### Test 3 – POST without DB (body parsing)

```bash
curl -s -X POST http://localhost:5001/ping -H "Content-Type: application/json" -d '{"name":"test"}'
```

- **Expected:** `{"pong":true,"body":{"name":"test"}}`. In Terminal 1 you should see `POST /ping hit, body: { name: 'test' }`.
- **If this hangs:** the issue is **not** the park route or DB; it’s something global (e.g. `express.json()` or middleware). Try increasing body limit (see below).

---

### Test 4 – Create park (POST)

```bash
curl -i -X POST http://localhost:5001/park \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Park","city":"Limerick","county":"Limerick","latitude":52.66,"longitude":-8.63}'
```

- **Expected:** HTTP 201 and JSON with the new park. In Terminal 1 you should see:
  - `REQ IN: POST /park`
  - `POST /park: handler entered`
  - `POST /park: calling Park.create`
  - (and the Sequelize SQL log if logging is on)
  - `REQ OUT: POST /park 201`
- **If Test 3 worked but this hangs:** the hang is in the park route or DB (e.g. `Park.create` or connection). Check Terminal 1: do you see `POST /park: handler entered`?
  - **Yes** → hang is almost certainly in `Park.create()` or DB (timeout or connection).
  - **No** → request isn’t reaching the park handler (e.g. wrong path or middleware).

---

## What to report back

Tell me:

1. For each of Tests 1–4: **responded in a few seconds** or **hung** (and after how long, if you waited).
2. From Terminal 1 for Test 4: exactly which of these lines appeared (if any):  
   `REQ IN: POST /park`, `POST /park: handler entered`, `POST /park: calling Park.create`, `REQ OUT: POST /park 201`.

That will show whether the problem is: server not running, body parsing, GET /park, or POST /park (and then DB vs route).

---

## If Test 3 (POST /ping) hangs – body parser

In `server.js`, change:

```js
app.use(express.json());
```

to:

```js
app.use(express.json({ limit: "10mb" }));
```

Restart the backend and run Test 3 again.
