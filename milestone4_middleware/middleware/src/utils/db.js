const { MongoClient } = require('mongodb');
const { mongo_db_uri } = require('../config/env');

async function getOrCreateCollection(collectionName) {
    console.log("collectionname:", collectionName);
    const client = new MongoClient(mongo_db_uri, { useUnifiedTopology: true });
    console.log(mongo_db_uri);
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        console.log('Connected to MongoDB');

        // Retrieve the collection if it exists, or create it if it does not
        const db = client.db();
        const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
        if (collectionExists) {
            console.log(`Collection "${collectionName}" exists`);
            const collection = db.collection(collectionName);
            return collection;
        } else {
            console.log(`Collection "${collectionName}" does not exist, creating it...`);
            const collection = await db.createCollection(collectionName);
            console.log(`Collection "${collectionName}" created`);
            return collection;
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

async function getValueFromCollection(collectionName) {
    const client = new MongoClient(mongo_db_uri, { useUnifiedTopology: true });
    try {
        
        await client.connect();
        console.log('Connected to MongoDB');

        
        const db = client.db();
        const collection = db.collection(collectionName);
        console.log(`Retrieved collection "${collectionName}"`);

        
        const value = await collection.find({}).toArray();;
        console.log(`Retrieved value: ${JSON.stringify(value)}`);

        
        return value;
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}
async function deleteTicketFromCollection(collectionName, ticket) {
    const client = new MongoClient(mongo_db_uri, { useUnifiedTopology: true });
    try {
        
        await client.connect();
        console.log('Connected to MongoDB');

        
        const db = client.db();
        const collection = db.collection(collectionName);
        console.log(`Retrieved collection "${collectionName}"`);

        
        await collection.deleteOne({ id: ticket.id });

    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

module.exports = {
    getOrCreateCollection,
    getValueFromCollection,
    deleteTicketFromCollection
};
