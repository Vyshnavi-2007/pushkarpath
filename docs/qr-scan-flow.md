# PushkarPath — QR Scan Flow Specification

The digital vehicle pass is the core coordination mechanism at parking gates across Rajahmundry. This document details the exact cryptographic verification, duplicate suppression, admission policy checks, atomic database transitions, and real-time Socket.IO broadcasts that occur when a volunteer scans a pass.

---

## QR Code Structure

Each vehicle pass encodes a JSON object with three fields:
```json
{
  "v": "AP28AB1234",
  "ver": 1,
  "sig": "3a8c7e9..."
}
```
- **`v`**: Uppercase alphanumeric registration number.
- **`ver`**: Integer QR version (starting at 1). Incrementing `ver` revokes previous physical/digital passes.
- **`sig`**: HMAC-SHA256 signature calculated over `${v}:${ver}` using `process.env.QR_SECRET`.

---

## Complete Scan Process Flowchart

```mermaid
flowchart TD
    Start(["Volunteer Scans QR Pass<br/>POST /api/scan"]) --> AuthCheck{"Authenticated & Active Staff/Admin?"}
    
    AuthCheck -- No --> Ret401["Return 401 / 403 Forbidden"]
    AuthCheck -- Yes --> ParseQR{"Validate JSON &<br/>Verify HMAC Signature"}

    %% Signature Check
    ParseQR -- "Invalid / Tampered" --> LogRejSig["Log ScanLog REJECTED<br/>(Invalid QR Signature)"]
    LogRejSig --> Ret400Sig["Return 400 Bad Request<br/>'Invalid QR code signature'"]
    ParseQR -- Valid --> FindVeh{"Vehicle exists in DB?"}

    %% Vehicle Lookup & Version Check
    FindVeh -- No --> LogRejReg["Log ScanLog REJECTED<br/>(Vehicle Not Registered)"]
    LogRejReg --> Ret404Reg["Return 404 Not Found"]
    FindVeh -- Yes --> CheckVer{"scannedVersion == vehicle.qrVersion?"}

    CheckVer -- No (Stale) --> LogRejVer["Log ScanLog REJECTED<br/>(Expired QR Version)"]
    LogRejVer --> Ret400Ver["Return 400 Bad Request<br/>'This QR code is expired'"]
    CheckVer -- Yes --> Cooldown{"Scanned at same lot & point<br/>within 10 seconds?"}

    %% Rapid Re-scan Cooldown
    Cooldown -- Yes --> LogRejDup["Log ScanLog REJECTED<br/>(Duplicate scan in 10s)"]
    LogRejDup --> Ret429Dup["Return 429 Too Many Requests<br/>'Duplicate scan detected'"]
    Cooldown -- No --> PointCheck{"Scan Point Assignment?"}

    %% ================= ENTRY BRANCH =================
    PointCheck -- "point == 'entry'" --> CheckClosed{"Is Lot Status Closed?"}
    
    CheckClosed -- Yes --> FindAltClosed["Find Nearest Alternate Lot"]
    FindAltClosed --> LogRejClosed["Log ScanLog REJECTED (Lot Closed)"]
    LogRejClosed --> Ret400Closed["Return 400 Bad Request<br/>'Lot is closed' + suggestedLot"]

    CheckClosed -- Open --> CheckInsideSelf{"Is vehicle.insideLot == lotCode?"}
    CheckInsideSelf -- Yes --> LogRejInSelf["Log ScanLog REJECTED<br/>(Already inside this lot)"]
    LogRejInSelf --> Ret400InSelf["Return 400 Bad Request<br/>'Vehicle already inside this lot'"]

    CheckInsideSelf -- No --> CheckInsideOther{"Is vehicle inside another lot?"}
    CheckInsideOther -- Yes --> LogRejInOther["Log ScanLog REJECTED<br/>(Already inside other lot)"]
    LogRejInOther --> Ret400InOther["Return 400 Bad Request<br/>'Must exit other lot before entry'"]

    CheckInsideOther -- No (Outside) --> CheckCapacity{"lot.occupied >= lot.capacity?"}
    CheckCapacity -- Yes (Full) --> FindAltFull["Find Nearest Alternate Lot"]
    FindAltFull --> LogRejFull["Log ScanLog REJECTED (Lot Full)"]
    LogRejFull --> Ret400Full["Return 400 Bad Request<br/>'Lot is at full capacity' + suggestedLot"]

    CheckCapacity -- Spaces Available --> AtomicInc{"Atomic Increment in DB<br/>findOneAndUpdate(<br/>occupied < capacity,<br/>$inc occupied: 1) succeeded?"}
    
    AtomicInc -- Race Lost (Capacity reached) --> FindAltRace["Find Nearest Alternate Lot"]
    FindAltRace --> LogRejRace["Log ScanLog REJECTED (Concurrent Full)"]
    LogRejRace --> Ret400Race["Return 400 Bad Request<br/>'Lot just reached maximum capacity'"]

    AtomicInc -- Success --> UpdateVehEntry["Update Vehicle:<br/>- insideLot = lotCode<br/>- lastEntryAt = now<br/>- lastScanAt = now"]
    UpdateVehEntry --> LogEntry["Write ScanLog: ENTRY"]
    LogEntry --> BroadcastEntry["Emit Socket.IO Events:<br/>- lot:update (new counts)<br/>- scan:new (scan record)"]
    BroadcastEntry --> Ret200Entry(["Return 200 OK<br/>{ success: true, type: 'ENTRY', lot, vehicle }"])

    %% ================= EXIT BRANCH =================
    PointCheck -- "point == 'exit'" --> CheckInsideExit{"Is vehicle.insideLot == lotCode?"}
    
    CheckInsideExit -- No --> LogRejExit["Log ScanLog REJECTED<br/>(Vehicle not inside lot)"]
    LogRejExit --> Ret400Exit["Return 400 Bad Request<br/>'Vehicle not recorded inside lot'"]

    CheckInsideExit -- Yes --> AtomicDec["Atomic Decrement in DB:<br/>findOneAndUpdate(<br/>occupied > 0,<br/>$inc occupied: -1)"]
    AtomicDec --> CalcDuration["Calculate Duration:<br/>durationMin = (now - lastEntryAt)"]
    CalcDuration --> UpdateVehExit["Update Vehicle:<br/>- insideLot = null<br/>- lastExitAt = now<br/>- lastScanAt = now"]
    UpdateVehExit --> LogExit["Write ScanLog: EXIT<br/>with durationMin"]
    LogExit --> BroadcastExit["Emit Socket.IO Events:<br/>- lot:update (decremented count)<br/>- scan:new (exit record)"]
    BroadcastExit --> Ret200Exit(["Return 200 OK<br/>{ success: true, type: 'EXIT', durationMin, lot }"])
```

---

## Detailed Step-by-Step Processing

### 1. Authentication & Permission Verification
- The request must bear a valid JWT in the `Authorization: Bearer <token>` header.
- The user must have role `'staff'` or `'admin'`.
- The user account must be active (`active === true`).
- Gate assignment (`lotCode` and `point`) is extracted from the staff user's profile or allowed via admin override.

### 2. Cryptographic Signature Validation
- The `qrPayload` parameter can be a JSON string or an already parsed object.
- The HMAC signature is re-computed using the server's private `process.env.QR_SECRET`.
- Time-constant comparison (`crypto.timingSafeEqual`) ensures resilience against timing side-channel attacks.
- If signature check fails:
  - Writes a `REJECTED` scan log with reason `'Invalid QR signature'`.
  - Responds with `HTTP 400` and emits `scan:new` via Socket.IO.

### 3. Version Check & Stale Pass Invalidation
- If an admin previously reissued a pass for vehicle `AP28AB1234`, its database record has `qrVersion = 2`.
- Any driver presenting a printed screenshot of version 1 is rejected immediately.
- Responds with `HTTP 400` (`'This QR code is expired'`).

### 4. Rapid Re-Scan Suppression (10-Second Cooldown)
- To prevent accidental double-scans from sensitive phone cameras or double-taps:
- The system checks if a scan log for the same vehicle, lot, and point was created in the last 10 seconds.
- If found, returns `HTTP 429 Too Many Requests`.

### 5. Admission Logic (Point: `entry`)
- **Status Check**: If the lot status is `'closed'`, entry is refused. The server calculates distances to other open lots with available space and returns the closest candidate under `suggestedLot`.
- **Anti-Passback (Same Lot)**: If `vehicle.insideLot === lot.code`, entry is refused with `'Vehicle already inside this lot'`.
- **Anti-Passback (Different Lot)**: If `vehicle.insideLot` is set to any other lot, entry is refused with `'Vehicle is currently recorded inside lot [OTHER] and must exit first'`.
- **Atomic Capacity Increment**:
  ```javascript
  const updatedLot = await ParkingLot.findOneAndUpdate(
    { code: lot.code, status: 'open', $expr: { $lt: ['$occupied', '$capacity'] } },
    { $inc: { occupied: 1 } },
    { new: true }
  );
  ```
  This atomic database operation guarantees zero over-allocation even under high concurrency.
- If successful, vehicle state is updated, a `ScanLog` of type `ENTRY` is created, and Socket.IO emits `lot:update` and `scan:new`.

### 6. Exit Logic (Point: `exit`)
- Checks if `vehicle.insideLot === lot.code`. If the vehicle was never recorded as entering this lot, exit is rejected.
- Decrements `occupied` atomically down to a minimum of 0.
- Computes `durationMin = Math.round((now - lastEntryAt) / 60000)`.
- Updates `vehicle.insideLot = null`.
- Writes a `ScanLog` of type `EXIT` recording `durationMin`.
- Broadcasts real-time events over Socket.IO so all pilgrims immediately see the newly freed parking space.
