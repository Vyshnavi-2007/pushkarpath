# PushkarPath — Admin Occupancy Correction Workflow

In massive crowd gatherings like Godavari Pushkaralu, discrepancies between sensor/QR gate counts and physical on-ground vehicle occupancy can occur (e.g., emergency service vehicles waved through gates, VIP arrivals, or temporary blockades).

PushkarPath provides administrators with an authorized override mechanism while ensuring full audit accountability. Every manual adjustment is tracked in an immutable audit ledger with mandatory justifications.

---

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Admin as District Administrator
    participant UI as Admin Dashboard (React)
    participant API as Express Server (/api/lots/:code/correct)
    participant Auth as Auth & Role Middleware
    participant DB as MongoDB (Mongoose)
    participant Socket as Socket.IO Hub
    participant Clients as Connected Clients (Pilgrim & Volunteer Maps)

    Admin->>UI: Selects Lot, enters new count (e.g., 85) & reason
    UI->>API: PUT /api/lots/PKG-01/correct<br/>{ actualCount: 85, reason: "Physical physical audit verified by traffic SI" }<br/>Header: Bearer <AdminJWT>
    
    API->>Auth: Verify JWT & role === 'admin'
    alt Not Admin or Invalid Token
        Auth-->>API: 401 Unauthorized / 403 Forbidden
        API-->>UI: Displays error: "Forbidden: Admin role required"
    else Authorized Admin
        Auth-->>API: Proceed
        API->>API: Validate input rules:<br/>1. actualCount is number<br/>2. 0 <= actualCount <= lot.capacity<br/>3. reason is string >= 5 chars
        
        alt Validation Failure
            API-->>UI: 400 Bad Request { error: "Validation message..." }
            UI-->>Admin: Displays field error message
        else Validation Passed
            API->>DB: Fetch current lot state & count tracked vehicles
            DB-->>API: Current lot { occupied: 110, capacity: 200 }
            
            API->>DB: Update ParkingLot { occupied: 85 }
            API->>DB: Insert AuditLog {<br/>  action: 'OCCUPANCY_CORRECTION',<br/>  target: 'PKG-01',<br/>  before: { occupied: 110, qrTrackedVehicles: 104 },<br/>  after: { occupied: 85 },<br/>  reason: 'Physical physical audit...',<br/>  byStaffId: 'ADMIN-01'<br/>}
            DB-->>API: Persisted
            
            par Real-Time Broadcast
                API->>Socket: emit('lot:update', updatedLot)
                API->>Socket: emit('audit:new', auditLogRecord)
                Socket-->>Clients: Real-time 'lot:update' (counts update without page reload)
                Socket-->>UI: 'audit:new' (appends to live audit feed)
            and HTTP Response
                API-->>UI: 200 OK { success: true, lot, qrTrackedVehicles: 104 }
            end
            
            UI-->>Admin: Displays green success notification and updated badge
        end
    end
```

---

## Validation & Business Rules

1. **Role Enforcement**:
   - Only accounts with `role: 'admin'` are authorized to call `PUT /api/lots/:code/correct`.
   - Volunteer and ground staff tokens (`role: 'staff'`) receive `HTTP 403 Forbidden`.

2. **Count Range Boundary**:
   - `actualCount` must be an integer.
   - `0 <= actualCount <= lot.capacity`.
   - Any value `< 0` or `> lot.capacity` is rejected with `HTTP 400 Bad Request`.

3. **Mandatory Justification**:
   - The `reason` field is mandatory.
   - Must be a non-empty string with at least **5 characters**.
   - Ensures an auditable paper trail explaining why on-ground counts diverged from digital gate scans.

4. **Audit Trail Immutability**:
   - An immutable record is created in `AuditLog` capturing:
     - `target`: The lot code (e.g. `'PKG-01'`).
     - `before`: Prior `occupied` count and count of `qrTrackedVehicles`.
     - `after`: New `actualCount`.
     - `reason`: The administrator's justification note.
     - `byStaffId`: ID of the admin making the change.
     - `createdAt`: ISO timestamp.

5. **Instantaneous Client Propagation**:
   - Calling `emitLotUpdate(lot)` broadcasts the new available capacity to all open pilgrim browsers and mobile devices within milliseconds.
   - If a lot was previously red (full), the map marker immediately transitions back to green or amber, opening traffic flow.
