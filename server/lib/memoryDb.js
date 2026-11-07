/**
 * PushkarPath In-Memory Storage Adapter
 * Zero-dependency, high-performance in-memory database
 * providing full API compatibility with Mongoose Model & Query methods.
 */

const crypto = require('crypto');

function getNestedVal(obj, path) {
  if (!obj || !path) return undefined;
  if (!path.includes('.')) return obj[path];
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr == null) return undefined;
    curr = curr[p];
  }
  return curr;
}

function matchesFilter(doc, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, val] of Object.entries(filter)) {
    if (key === '$expr') {
      if (val && val.$lt) {
        const leftKey = val.$lt[0].replace('$', '');
        const rightKey = val.$lt[1].replace('$', '');
        if (!((doc[leftKey] || 0) < (doc[rightKey] || 0))) return false;
      }
      continue;
    }

    const dVal = getNestedVal(doc, key);

    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if ('$regex' in val) {
        const regex = new RegExp(val.$regex, val.$options || '');
        if (!regex.test(dVal || '')) return false;
      }
      if ('$ne' in val) {
        if (dVal === val.$ne) return false;
      }
      if ('$in' in val) {
        if (!val.$in.includes(dVal)) return false;
      }
      if ('$lt' in val) {
        if (!(dVal < val.$lt)) return false;
      }
      if ('$lte' in val) {
        if (!(dVal <= val.$lte)) return false;
      }
      if ('$gt' in val) {
        if (!(dVal > val.$gt)) return false;
      }
      if ('$gte' in val) {
        if (!(dVal >= val.$gte)) return false;
      }
    } else {
      if (dVal !== val) return false;
    }
  }

  return true;
}

function applyUpdates(doc, update = {}) {
  const updated = { ...doc };

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      if (k.includes('.')) {
        const parts = k.split('.');
        if (!updated[parts[0]]) updated[parts[0]] = {};
        updated[parts[0]][parts[1]] = v;
      } else {
        updated[k] = v;
      }
    }
  }

  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      updated[k] = (updated[k] || 0) + v;
      if (k === 'occupied' && updated[k] < 0) {
        updated[k] = 0; // Never allow occupied to drop below 0
      }
    }
  }

  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      delete updated[k];
    }
  }

  updated.updatedAt = new Date();
  return updated;
}

function createQuery(dataFn, interfaceObj) {
  let sortFn = null;
  let limitN = null;
  let skipN = 0;

  const query = {
    sort(sortObj = {}) {
      const [key, dir] = Object.entries(sortObj)[0] || [];
      if (key) {
        sortFn = (a, b) => {
          if (a[key] < b[key]) return dir === -1 ? 1 : -1;
          if (a[key] > b[key]) return dir === -1 ? -1 : 1;
          return 0;
        };
      }
      return query;
    },
    skip(n) {
      skipN = Math.max(0, parseInt(n, 10) || 0);
      return query;
    },
    limit(n) {
      limitN = n;
      return query;
    },
    select() {
      return query;
    },
    populate() {
      return query;
    },
    lean() {
      return query;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve()
        .then(dataFn)
        .then((data) => {
          let results = [...data];
          if (sortFn) results.sort(sortFn);
          if (skipN > 0) results = results.slice(skipN);
          if (limitN !== null) results = results.slice(0, limitN);
          return results.map((d) => wrapDoc(d, interfaceObj));
        })
        .then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return query.then(null, onRejected);
    }
  };

  return query;
}

function createSingleQuery(dataFn, interfaceObj) {
  const query = {
    select() {
      return query;
    },
    populate() {
      return query;
    },
    lean() {
      return query;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve()
        .then(dataFn)
        .then((found) => (found ? wrapDoc(found, interfaceObj) : null))
        .then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return query.then(null, onRejected);
    }
  };

  return query;
}

function wrapDoc(raw, modelRef) {
  if (!raw) return null;

  let available = undefined;
  if (modelRef._name === 'ParkingLot') {
    available = Math.max(0, (raw.capacity || 0) - (raw.occupied || 0));
  }

  const doc = {
    ...raw,
    id: raw._id,
    ...(available !== undefined ? { available } : {}),
    toObject() {
      return { ...raw, id: raw._id, ...(available !== undefined ? { available } : {}) };
    },
    toJSON() {
      return { ...raw, id: raw._id, ...(available !== undefined ? { available } : {}) };
    },
    async save() {
      const idx = modelRef._data.findIndex((d) => d._id === raw._id);
      if (idx !== -1) {
        modelRef._data[idx] = { ...this, updatedAt: new Date() };
      } else {
        modelRef._data.push(this);
      }
      return this;
    }
  };

  return doc;
}

function createModelInterface(name) {
  let store = [];

  const interfaceObj = {
    _name: name,
    _data: store,

    find(filter = {}) {
      return createQuery(
        () => store.filter((d) => matchesFilter(d, filter)),
        interfaceObj
      );
    },

    findOne(filter = {}) {
      return createSingleQuery(
        () => store.find((d) => matchesFilter(d, filter)),
        interfaceObj
      );
    },

    findById(id) {
      const strId = String(id);
      return createSingleQuery(
        () => store.find((d) => String(d._id) === strId || String(d.id) === strId),
        interfaceObj
      );
    },

    findOneAndUpdate(filter = {}, update = {}, options = {}) {
      return createSingleQuery(() => {
        const idx = store.findIndex((d) => matchesFilter(d, filter));

        if (idx !== -1) {
          const oldDoc = store[idx];
          const newDoc = applyUpdates(oldDoc, update);
          store[idx] = newDoc;
          return options.new ? newDoc : oldDoc;
        }

        if (options.upsert) {
          const newDoc = {
            _id: crypto.randomBytes(12).toString('hex'),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...filter,
            ...(update.$set || {})
          };
          store.push(newDoc);
          return newDoc;
        }

        return null;
      }, interfaceObj);
    },

    async create(data) {
      if (Array.isArray(data)) {
        return Promise.all(data.map((d) => interfaceObj.create(d)));
      }
      const doc = {
        _id: data._id || crypto.randomBytes(12).toString('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      };
      store.push(doc);
      return wrapDoc(doc, interfaceObj);
    },

    async countDocuments(filter = {}) {
      return store.filter((d) => matchesFilter(d, filter)).length;
    },

    async deleteMany(filter = {}) {
      store = store.filter((d) => !matchesFilter(d, filter));
      interfaceObj._data = store;
      return { deletedCount: 0 };
    },

    async reset(data = []) {
      store = data.map((d) => ({
        _id: d._id || crypto.randomBytes(12).toString('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d
      }));
      interfaceObj._data = store;
    }
  };

  return interfaceObj;
}

const memoryDb = {
  Ghat: createModelInterface('Ghat'),
  ParkingLot: createModelInterface('ParkingLot'),
  User: createModelInterface('User'),
  Vehicle: createModelInterface('Vehicle'),
  ScanLog: createModelInterface('ScanLog'),
  AuditLog: createModelInterface('AuditLog'),
  isMemoryMode: false
};

module.exports = memoryDb;
