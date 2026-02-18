const { MongoClient } = require('mongodb');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb://admin:123456@127.0.0.1:27017/?authSource=admin';
const dbName = 'dev';
const outputDir = path.join(__dirname, 'mongodb_export_csv');

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        result[newKey] = JSON.stringify(obj[key]);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}

async function exportAllCollectionsToCSV() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Found ${collections.length} collections in database "${dbName}"`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();

      if (documents.length === 0) {
        console.log(`Skipped "${collectionName}" (empty collection)`);
        continue;
      }

      const flattenedDocs = documents.map(doc => flattenObject(doc));

      const allFields = new Set();
      flattenedDocs.forEach(doc => {
        Object.keys(doc).forEach(key => allFields.add(key));
      });

      const parser = new Parser({ fields: Array.from(allFields) });
      const csv = parser.parse(flattenedDocs);

      const outputFile = path.join(outputDir, `${collectionName}.csv`);
      fs.writeFileSync(outputFile, csv, 'utf8');

      console.log(`Exported ${documents.length} documents from "${collectionName}" to ${outputFile}`);
    }

    console.log('\nExport completed successfully!');
    console.log(`All data saved to: ${outputDir}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

exportAllCollectionsToCSV();
