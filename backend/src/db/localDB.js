const fs = require('fs');
const path = require('path');

class LocalDB {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data');
    this.collections = {};
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  getFilePath(collection) {
    return path.join(this.dbPath, `${collection}.json`);
  }

  load(collection) {
    const filePath = this.getFilePath(collection);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  }

  save(collection, data) {
    const filePath = this.getFilePath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // CRUD operations
  insert(collection, doc) {
    const data = this.load(collection);
    const newDoc = {
      _id: this.generateId(),
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newDoc);
    this.save(collection, data);
    return newDoc;
  }

  find(collection, query = {}) {
    const data = this.load(collection);
    if (Object.keys(query).length === 0) {
      return data;
    }
    return data.filter(doc => {
      return Object.keys(query).every(key => {
        if (query[key] && query[key].$regex) {
          const regex = new RegExp(query[key].$regex, query[key].$options || '');
          return regex.test(doc[key]);
        }
        if (query[key] && query[key].$in) {
          return query[key].$in.includes(doc[key]);
        }
        if (query[key] && typeof query[key] === 'object' && query[key].$or) {
          return query[key].$or.some(condition => {
            return Object.keys(condition).every(k => {
              if (condition[k].$regex) {
                const regex = new RegExp(condition[k].$regex, condition[k].$options || '');
                return regex.test(doc[k]);
              }
              return doc[k] === condition[k];
            });
          });
        }
        return doc[key] === query[key];
      });
    });
  }

  findOne(collection, query) {
    const results = this.find(collection, query);
    return results[0] || null;
  }

  findById(collection, id) {
    return this.findOne(collection, { _id: id });
  }

  update(collection, query, update) {
    const data = this.load(collection);
    let updated = 0;
    const newData = data.map(doc => {
      const matches = Object.keys(query).every(key => doc[key] === query[key]);
      if (matches) {
        updated++;
        return {
          ...doc,
          ...update,
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    });
    this.save(collection, newData);
    return updated;
  }

  updateById(collection, id, update) {
    return this.update(collection, { _id: id }, update);
  }

  delete(collection, query) {
    const data = this.load(collection);
    const newData = data.filter(doc => {
      return !Object.keys(query).every(key => doc[key] === query[key]);
    });
    const deleted = data.length - newData.length;
    this.save(collection, newData);
    return deleted;
  }

  deleteById(collection, id) {
    return this.delete(collection, { _id: id });
  }

  count(collection, query = {}) {
    return this.find(collection, query).length;
  }

  // Pagination helper
  paginate(collection, query = {}, options = {}) {
    const { page = 1, limit = 20, sort = {} } = options;
    let results = this.find(collection, query);
    
    // Sort
    if (Object.keys(sort).length > 0) {
      const sortKey = Object.keys(sort)[0];
      const sortOrder = sort[sortKey];
      results.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return sortOrder === 1 ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortOrder === 1 ? 1 : -1;
        return 0;
      });
    }

    const total = results.length;
    const skip = (page - 1) * limit;
    const paginatedResults = results.slice(skip, skip + limit);

    return {
      data: paginatedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new LocalDB();
