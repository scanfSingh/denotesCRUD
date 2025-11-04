import { MongoClient } from "mongodb";

const options = { appName: "devrel.template.nextjs" };

let client: MongoClient | null = null;

function getClient(): MongoClient {
  if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  const uri = process.env.MONGODB_URI;

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClient?: MongoClient;
    };

    if (!globalWithMongo._mongoClient) {
      globalWithMongo._mongoClient = new MongoClient(uri, options);
    }
    return globalWithMongo._mongoClient;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!client) {
      client = new MongoClient(uri, options);
    }
    return client;
  }
}

// Export a proxy that lazily initializes the client
const clientProxy = new Proxy({} as MongoClient, {
  get(_target, prop) {
    const actualClient = getClient();
    const value = (actualClient as any)[prop];
    if (typeof value === "function") {
      return value.bind(actualClient);
    }
    return value;
  },
});

export default clientProxy;
