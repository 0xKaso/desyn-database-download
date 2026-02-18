const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb://kasoqian:kasoqian@127.0.0.1:27017/?authSource=admin';
const dbName = 'dev';
const outputDir = path.join(__dirname, 'mongodb_export');

async function exportAllCollections() {
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

      const outputFile = path.join(outputDir, `${collectionName}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(documents, null, 2), 'utf8');

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

exportAllCollections();
